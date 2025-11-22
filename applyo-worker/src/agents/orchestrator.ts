import { Agent } from "agents";
import { openai } from "@ai-sdk/openai";
import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { getAgentByName } from "agents";
import { searchWeb, vectorizeSearch } from "../lib/tools"; 
import { extractDomain } from "../lib/utils";
import type { CloudflareBindings } from "../env.d";
import { drizzle } from "drizzle-orm/d1";
import { schema } from "../db";
import { companyProfiles, employees } from "../db/companies.schema";
import { eq, and, or, sql } from "drizzle-orm";
import { VectorizeHandler } from "../lib/vectorize";

class Orchestrator extends Agent<CloudflareBindings> {
  async onStart() {
    console.log('orchestrator agent started');
  }

  async upsertCompany(
    companyName: string, 
    website: string | null,
    additionalData?: {
      description?: string | null;
      techStack?: string | null;
      industry?: string | null;
      yearFounded?: number | null;
      headquarters?: string | null;
      revenue?: string | null;
      funding?: string | null;
      employeeCountMin?: number | null;
      employeeCountMax?: number | null;
    }
  ): Promise<number> {
    const db = drizzle(this.env.DB, { schema });
    
    if (!companyName || companyName.trim() === "") {
      throw new Error("Company name is required");
    }

    const normalizedName = companyName.trim();
    const conditions = [sql`LOWER(${companyProfiles.companyName}) = LOWER(${normalizedName})`];
    
    if (website && website.trim() !== "") {
      conditions.push(eq(companyProfiles.website, website.trim()));
    }

    const existing = await db.select()
      .from(companyProfiles)
      .where(or(...conditions))
      .limit(1)
      .get();

    const updateData: {
      website?: string | null;
      description?: string | null;
      techStack?: string | null;
      industry?: string | null;
      yearFounded?: number | null;
      headquarters?: string | null;
      revenue?: string | null;
      funding?: string | null;
      employeeCountMin?: number | null;
      employeeCountMax?: number | null;
    } = {};

    if (website && website.trim() !== "") {
      updateData.website = website.trim();
    }

    if (additionalData) {
      if (additionalData.description !== undefined) updateData.description = additionalData.description?.trim() || null;
      if (additionalData.techStack !== undefined) updateData.techStack = additionalData.techStack?.trim() || null;
      if (additionalData.industry !== undefined) updateData.industry = additionalData.industry?.trim() || null;
      if (additionalData.yearFounded !== undefined) updateData.yearFounded = additionalData.yearFounded;
      if (additionalData.headquarters !== undefined) updateData.headquarters = additionalData.headquarters?.trim() || null;
      if (additionalData.revenue !== undefined) updateData.revenue = additionalData.revenue?.trim() || null;
      if (additionalData.funding !== undefined) updateData.funding = additionalData.funding?.trim() || null;
      if (additionalData.employeeCountMin !== undefined) updateData.employeeCountMin = additionalData.employeeCountMin;
      if (additionalData.employeeCountMax !== undefined) updateData.employeeCountMax = additionalData.employeeCountMax;
    }

    if (existing) {
      // Update existing company with any new data (only update non-null fields)
      const fieldsToUpdate = Object.fromEntries(
        Object.entries(updateData).filter(([_, v]) => v !== null && v !== undefined)
      );
      
      if (Object.keys(fieldsToUpdate).length > 0) {
        await db.update(companyProfiles)
          .set(fieldsToUpdate)
          .where(eq(companyProfiles.id, existing.id));
      }
      
      return existing.id;
    }

    const result = await db.insert(companyProfiles)
      .values({
        companyName: normalizedName,
        website: website?.trim() || null,
        description: additionalData?.description?.trim() || null,
        techStack: additionalData?.techStack?.trim() || null,
        industry: additionalData?.industry?.trim() || null,
        yearFounded: additionalData?.yearFounded || null,
        headquarters: additionalData?.headquarters?.trim() || null,
        revenue: additionalData?.revenue?.trim() || null,
        funding: additionalData?.funding?.trim() || null,
        employeeCountMin: additionalData?.employeeCountMin || null,
        employeeCountMax: additionalData?.employeeCountMax || null,
      })
      .returning({ id: companyProfiles.id });

    return result[0].id;
  }

  async upsertEmployee(companyId: number, employeeName: string, employeeTitle: string | null, email: string | null): Promise<number> {
    const db = drizzle(this.env.DB, { schema });
    
    if (!employeeName || employeeName.trim() === "") {
      throw new Error("Employee name is required");
    }

    const normalizedName = employeeName.trim();
    
    const existing = await db.select()
      .from(employees)
      .where(
        and(
          sql`LOWER(${employees.employeeName}) = LOWER(${normalizedName})`,
          eq(employees.companyId, companyId)
        )
      )
      .limit(1)
      .get();

    if (existing) {
      const updateData: { employeeTitle?: string | null; email?: string | null } = {};
      
      if (employeeTitle && employeeTitle.trim() !== "") {
        updateData.employeeTitle = employeeTitle.trim();
      }
      
      if (email && email.trim() !== "") {
        updateData.email = email.trim();
      }

      if (Object.keys(updateData).length > 0) {
        await db.update(employees)
          .set(updateData)
          .where(eq(employees.id, existing.id));
      }
      
      return existing.id;
    } else {
      const result = await db.insert(employees)
        .values({
          employeeName: normalizedName,
          employeeTitle: employeeTitle?.trim() || null,
          email: email?.trim() || null,
          companyId: companyId,
        })
        .returning({ id: employees.id });
      
      return result[0].id;
    }
  }

  async onRequest(_request: Request): Promise<Response> {
    const body = await _request.json() as { query?: string };
    const query = body.query || "";

    if (!query) {
      return new Response(
        JSON.stringify({ error: "query is required" }),
        { 
          status: 400,
          headers: { "content-type": "application/json" }
        }
      );
    }

    const model = openai("gpt-4o-2024-11-20");

    const callPeopleFinder = tool({
      description: "find high-ranking people (executives, founders, c-suite) at a specific company via external search.",
      inputSchema: z.object({
        company: z.string().describe("company name (required)"),
        website: z.string().optional().describe("known company website url"),
        notes: z.string().optional().describe("context e.g. 'looking for cto'"),
      }),
      execute: async ({ company, website, notes }) => {
        try {
          const agent = await getAgentByName(this.env.PeopleFinder, "main");
          const requestBody: { company: string; website?: string; notes?: string } = { company };
          if (website) requestBody.website = website;
          if (notes) requestBody.notes = notes;
          
          const resp = await agent.fetch(
            new Request("http://internal", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestBody),
            })
          );
          return await resp.json();
        } catch (error) {
          console.error("error calling PeopleFinder:", error);
          return { company, website: website || "", people: [], error: String(error) };
        }
      }
    });

    const callEmailFinder = tool({
      description: "find verified email addresses for a specific person at a company.",
      inputSchema: z.object({
        firstName: z.string(),
        lastName: z.string(),
        company: z.string(),
        domain: z.string(),
      }),
      execute: async ({ firstName, lastName, company, domain }) => {
        try {
          const agent = await getAgentByName(this.env.EmailFinder, "main");
          const resp = await agent.fetch(
            new Request("http://internal", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ firstName, lastName, company, domain }),
            })
          );
          return await resp.json();
        } catch (error) {
          console.error("error calling EmailFinder:", error);
          return { emails: [], error: String(error) };
        }
      }
    });

    const tools = { 
      callPeopleFinder, 
      callEmailFinder, 
      searchWeb, 
      vectorizeSearch 
    };

    const result = await generateText({
      model,
      tools,
      prompt: `You are an orchestrator that finds emails for people at companies.

Available tools:
1. **vectorizeSearch** - Semantic search of our INTERNAL database. Returns companies and employees.
2. **callPeopleFinder** - External search for executives/leaders.
3. **callEmailFinder** - External search for emails.
4. **searchWeb** - General web search (only for verification).

Decision flow:
1. **CRITICAL FIRST STEP**: Call **vectorizeSearch** with the user's query.
   - Check if the results contain the specific company and people requested.
   - **IMPORTANT**: When vectorizeSearch returns company results, look at the \`companies\` array. Each company object contains metadata fields like:
     * \`company_name\` → use as "company"
     * \`website\` → use as "website"
     * \`description\` → use as "description"
     * \`tech_stack\` → use as "techStack"
     * \`industry\` → use as "industry"
     * \`year_founded\` → convert to number, use as "yearFounded"
     * \`headquarters\` → use as "headquarters"
     * \`revenue\` → use as "revenue"
     * \`funding\` → use as "funding"
     * \`employee_count_min\` → convert to number, use as "employeeCountMin"
     * \`employee_count_max\` → convert to number, use as "employeeCountMax"
   - If you find relevant people with emails in the vector results (looks like high confidence/score > 0.8), **STOP**. Do not call external tools. Format the JSON using the vector data and return immediately. **MUST include ALL company metadata fields from the vector search results.**
   
2. **IF Internal DB fails (no results or low relevance)**:
   - Extract company name and requirements from query.
   - Call **callPeopleFinder** to get names.
   - Derive domain (using **searchWeb** only if strictly necessary to confirm domain).
   - Call **callEmailFinder** for each person.
   - **NOTE**: External tools don't provide company details, so only include company name and website in this case.

3. Return ONLY valid JSON with this structure:
{
  "company": "Company Name",
  "website": "https://company.com",
  "description": "Company description if available from vector search",
  "techStack": "Tech stack if available",
  "industry": "Industry if available",
  "yearFounded": 2020,
  "headquarters": "City, State if available",
  "revenue": "Revenue info if available",
  "funding": "Funding info if available",
  "employeeCountMin": 10,
  "employeeCountMax": 50,
  "people": [
    {
      "name": "Full Name",
      "role": "Job Title",
      "emails": ["email1@domain.com"]
    }
  ]
}

**CRITICAL**: When using vectorizeSearch results, you MUST extract and include ALL company metadata fields. Look at the \`companies\` array in the vector search response and map each field to the JSON structure above.

Rules:
- If vector search gives you the data, USE IT. It is faster and cheaper.
- Only include people with at least one verified email.
- Return raw JSON only.

User query: ${query}`,
      toolChoice: "auto",
      stopWhen: stepCountIs(15)
    });

    let finalResult;
    try {
      let cleanText = result.text.trim();
      if (cleanText.startsWith('```json')) cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      else if (cleanText.startsWith('```')) cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');

      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleanText = jsonMatch[0];

      finalResult = JSON.parse(cleanText);
      
      if (finalResult.people && Array.isArray(finalResult.people)) {
        finalResult.people = finalResult.people.filter((person: any) => 
          person.emails && Array.isArray(person.emails) && person.emails.length > 0
        );
      }
      
      if (!finalResult.people?.length) {
        return new Response(JSON.stringify({ message: "no emails found", state: this.state }), {
            headers: { "Content-Type": "application/json" },
        });
      }

      // Save to database
      try {
        const companyName = finalResult.company || "";
        const website = finalResult.website || null;
        
        // Debug logging
        console.log('[Orchestrator] Saving company:', {
          companyName,
          website,
          hasDescription: !!finalResult.description,
          hasTechStack: !!finalResult.techStack,
          hasIndustry: !!finalResult.industry,
          hasEmployeeCount: !!(finalResult.employeeCountMin || finalResult.employee_count_min),
          finalResultKeys: Object.keys(finalResult)
        });
        
        if (companyName && companyName.trim() !== "") {
          // Extract company details from finalResult
          const companyData = {
            description: finalResult.description || null,
            techStack: finalResult.techStack || finalResult.tech_stack || null,
            industry: finalResult.industry || null,
            yearFounded: finalResult.yearFounded || finalResult.year_founded ? parseInt(String(finalResult.yearFounded || finalResult.year_founded)) : null,
            headquarters: finalResult.headquarters || null,
            revenue: finalResult.revenue || null,
            funding: finalResult.funding || null,
            employeeCountMin: finalResult.employeeCountMin || finalResult.employee_count_min ? parseInt(String(finalResult.employeeCountMin || finalResult.employee_count_min)) : null,
            employeeCountMax: finalResult.employeeCountMax || finalResult.employee_count_max ? parseInt(String(finalResult.employeeCountMax || finalResult.employee_count_max)) : null,
          };
          
          console.log('[Orchestrator] Extracted company data:', companyData);

          const companyId = await this.upsertCompany(companyName, website, companyData);
          const vectorHandler = new VectorizeHandler(this.env);
          const employeeIds: number[] = [];
          
          // Save each employee
          for (const person of finalResult.people) {
            if (person.name && person.emails && person.emails.length > 0) {
              const email = person.emails[0]; // Use first email
              const role = person.role || null;
              const employeeId = await this.upsertEmployee(companyId, person.name, role, email);
              employeeIds.push(employeeId);
            }
          }

          // Update vector indexes
          await vectorHandler.updateCompany(companyId);
          
          // Update employee vectors
          for (const employeeId of employeeIds) {
            await vectorHandler.updateEmployee(employeeId);
          }
        }
      } catch (dbError) {
        console.error("Error saving to database:", dbError);
        // Don't fail the request if DB save fails
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: "parsing error" }), { status: 500 });
    }

    // favicon logic
    let favicon = null;
    if (finalResult.website) {
      const domain = extractDomain(finalResult.website);
      if (domain) favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    }

    return new Response(
      JSON.stringify({ ...finalResult, favicon, state: this.state }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
}

export default Orchestrator;