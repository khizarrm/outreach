import { fromHono } from "chanfana";
import { OpenAPIRoute } from "chanfana";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { CloudflareBindings } from "./env.d";
import Prospects from "./agents/prospector";
import PeopleFinder from "./agents/peoplefinder";
import EmailFinder from "./agents/emailfinder";
import Orchestrator from "./agents/orchestrator";
import FinderV2 from "./agents/finder";
import { ProtectedEmailSendRoute } from "./endpoints/emailSend";
import { Agent, AgentNamespace, getAgentByName, routeAgentRequest } from 'agents';
import { z } from "zod";
import { ProtectedTemplatesCreateRoute, ProtectedTemplatesListRoute, ProtectedTemplatesDeleteRoute, ProtectedTemplatesUpdateRoute, ProtectedTemplateProcessRoute } from "./endpoints/templates";
import { ProtectedCompaniesListRoute, ProtectedCompanyEmployeesRoute } from "./endpoints/companies";
import { VectorizePopulateCompaniesRoute, VectorizePopulateEmployeesRoute, VectorizeSearchRoute, VectorizeStatsRoute, VectorizeUpdateCompanyRoute } from "./endpoints/vectorize";
import { PublicWaitlistRoute } from "./endpoints/waitlist";
import { findExistingCompanyAndEmployees } from "./db/companies";


interface Env {
  Prospects: AgentNamespace<Prospects>;
  PeopleFinder: AgentNamespace<PeopleFinder>;
  EmailFinder: AgentNamespace<EmailFinder>;
  Orchestrator: AgentNamespace<Orchestrator>;
  FINDER: AgentNamespace<FinderV2>;
}

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Global CORS configuration for all routes
app.use(
    "*",
    cors({
        origin: (origin) => {
            const allowed = [
                "http://localhost:3000",
                "http://localhost:3001",
                "https://applyo-frontend.applyo.workers.dev",
                "https://try-outreach.vercel.app"
            ];
            return allowed.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin) ? origin : allowed[0];
        },
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        exposeHeaders: ["Content-Length"],
        maxAge: 600,
        credentials: true,
    })
);

// Create OpenAPI instance
const openapi = fromHono(app, {
    docs_url: "/",
    schema: {
        info: {
            title: "Applyo API",
            version: "1.0.0",
            description: `A modern API for outreach and company management.`,
        },
    },
});

// ============= DEMO API ROUTES =============

// Public Hello Route
class PublicHelloRoute extends OpenAPIRoute {
    schema = {
        tags: ["Public"],
        summary: "Public Hello Endpoint",
        description: "A public endpoint that doesn't require authentication",
        responses: {
            "200": {
                description: "Successful response",
                content: {
                    "application/json": {
                        schema: z.object({
                            message: z.string(),
                            timestamp: z.string(),
                            authenticated: z.boolean(),
                        }),
                    },
                },
            },
        },
    };

    async handle(c: any) {
        return {
            message: "Hello! This is a public endpoint.",
            timestamp: new Date().toISOString(),
            authenticated: false,
        };
    }
}

// Public Info Route
class PublicInfoRoute extends OpenAPIRoute {
    schema = {
        tags: ["Public"],
        summary: "Server Information",
        description: "Get information about the API service",
        responses: {
            "200": {
                description: "Server information",
                content: {
                    "application/json": {
                        schema: z.object({
                            service: z.string(),
                            version: z.string(),
                            environment: z.string(),
                            features: z.array(z.string()),
                        }),
                    },
                },
            },
        },
    };

    async handle(c: any) {
        return {
            service: "Applyo API",
            version: "1.0.0",
            environment: "cloudflare-workers",
            features: ["rate-limiting", "geolocation"],
        };
    }
}

class ProspectorRoute extends OpenAPIRoute {
    schema = {
      tags: ["Agents"],
      summary: "Call Prospects Agent",
      description: "Proxy request to the Prospects Agent (Cloudflare Agent)",
      request: {
        body: {
          content: {
            "application/json": {
              schema: z.object({
                summary: z.string().describe("Professional summary describing the user's background, interests, and skills"),
                preferences: z.string().optional().describe("Additional work preferences and requirements"),
                location: z.string().optional().describe("Geographic location or region for contextualizing company search"),
              }),
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Agent response",
          content: {
            "application/json": {
              schema: z.object({
                message: z.string().optional(),
                result: z.any().optional(),
              }),
            },
          },
        },
      },
    };

    async handle(c: any) {
      const env = c.env;

      const reqData = await this.getValidatedData<typeof this.schema>();
      const body = JSON.stringify(reqData.body);

      // manually call the agent
      const agent = await getAgentByName(env.Prospects, "main");
      const resp = await agent.fetch(
        new Request("http://internal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        })
      );

      return resp;
    }
  }

class PeopleFinderRoute extends OpenAPIRoute {
    schema = {
      tags: ["Agents"],
      summary: "Call PeopleFinder Agent",
      description: "Find high-ranking individuals at a company. The agent will search for founders, executives, and C-suite leaders.",
      request: {
        body: {
          content: {
            "application/json": {
              schema: z.object({
                company: z.string().min(1).describe("Company name to search for people"),
                website: z.string().optional().describe("Optional: Company website URL if already known"),
                notes: z.string().optional().describe("Optional: Additional context about the company to help with search"),
              }),
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Agent response with company name, website, and up to 3 high-ranking individuals",
          content: {
            "application/json": {
              schema: z.object({
                company: z.string(),
                website: z.string(),
                people: z.array(
                  z.object({
                    name: z.string(),
                    role: z.string(),
                  })
                ).optional(),
                state: z.any().optional(),
                error: z.string().optional(),
                rawText: z.string().optional(),
                parseError: z.string().optional(),
              }),
            },
          },
        },
        "400": {
          description: "Bad request - missing required company parameter",
          content: {
            "application/json": {
              schema: z.object({
                error: z.string(),
              }),
            },
          },
        },
      },
    };

    async handle(c: any) {
      const env = c.env;

      const reqData = await this.getValidatedData<typeof this.schema>();
      const body = JSON.stringify(reqData.body);

      // manually call the agent
      const agent = await getAgentByName(env.PeopleFinder, "main");
      const resp = await agent.fetch(
        new Request("http://internal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        })
      );

      return resp;
    }
  }

class EmailFinderRoute extends OpenAPIRoute {
    schema = {
      tags: ["Agents"],
      summary: "Call EmailFinder Agent",
      description: "Find likely professional email addresses for a person at a company using open-web intelligence",
      request: {
        body: {
          content: {
            "application/json": {
              schema: z.object({
                firstName: z.string().min(1).describe("Person's first name"),
                lastName: z.string().min(1).describe("Person's last name"),
                company: z.string().min(1).describe("Company name"),
                domain: z.string().min(1).describe("Company domain (e.g., shopify.com)"),
              }),
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Agent response with discovered email addresses",
          content: {
            "application/json": {
              schema: z.object({
                emails: z.array(z.string()).describe("List of discovered email addresses"),
                pattern_found: z.string().describe("Email pattern discovered (e.g., firstname.lastname)"),
                research_notes: z.string().describe("Summary of where clues came from"),
                state: z.any().optional(),
                error: z.string().optional(),
              }),
            },
          },
        },
      },
    };

    async handle(c: any) {
      const env = c.env;

      const reqData = await this.getValidatedData<typeof this.schema>();
      const body = JSON.stringify(reqData.body);

      // manually call the agent
      const agent = await getAgentByName(env.EmailFinder, "main");
      const resp = await agent.fetch(
        new Request("http://internal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        })
      );

      return resp;
    }
  }

class OrchestratorRoute extends OpenAPIRoute {
    schema = {
      tags: ["Agents"],
      summary: "Call Orchestrator Agent",
      description: "Find emails for people at a company. Takes a query like 'find founder emails at datacurve' or just 'datacurve'",
      request: {
        body: {
          content: {
            "application/json": {
              schema: z.object({
                query: z.string().min(1).describe("Query like 'find founder emails at datacurve' or just 'datacurve'"),
              }),
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Agent response with people and their emails",
          content: {
            "application/json": {
              schema: z.object({
                company: z.string().describe("Company name"),
                people: z.array(
                  z.object({
                    name: z.string().describe("Person's full name"),
                    role: z.string().describe("Job title"),
                    emails: z.array(z.string()).describe("List of email addresses"),
                  })
                ).describe("List of people with their emails"),
                state: z.any().optional(),
                error: z.string().optional(),
              }),
            },
          },
        },
      },
    };

    async handle(c: any) {
      const env = c.env;

      const reqData = await this.getValidatedData<typeof this.schema>();
      const query = reqData.body.query;
      
      // Check database first before calling orchestrator
      try {
        const existing = await findExistingCompanyAndEmployees(env.DB, query);
        
        if (existing && existing.employees.length > 0) {
          // Format response to match orchestrator output
          const people = existing.employees
            .filter(emp => emp.email && emp.email.trim() !== "") // Only include employees with emails
            .map(emp => ({
              name: emp.employeeName,
              role: emp.employeeTitle || null,
              emails: emp.email ? [emp.email] : [],
            }));
          
          if (people.length > 0) {
            return new Response(
              JSON.stringify({
                company: existing.company.companyName,
                website: existing.company.website || null,
                description: existing.company.description || null,
                techStack: existing.company.techStack || null,
                industry: existing.company.industry || null,
                yearFounded: existing.company.yearFounded || null,
                headquarters: existing.company.headquarters || null,
                revenue: existing.company.revenue || null,
                funding: existing.company.funding || null,
                employeeCountMin: existing.company.employeeCountMin || null,
                employeeCountMax: existing.company.employeeCountMax || null,
                people,
                state: {},
              }),
              { 
                headers: { "Content-Type": "application/json" },
                status: 200,
              }
            );
          }
        }
      } catch (dbError) {
        // If DB check fails, continue to orchestrator
        console.error("Error checking database:", dbError);
      }

      // If not found in DB, proceed with orchestrator
      const body = JSON.stringify(reqData.body);

      // manually call the agent
      const agent = await getAgentByName(env.Orchestrator, "main");
      const resp = await agent.fetch(
        new Request("http://internal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        })
      );

      return resp;
    }
  }

class FinderRoute extends OpenAPIRoute {
    schema = {
      tags: ["Agents"],
      summary: "Call Finder Agent",
      description: "Smart research assistant that uses semantic search to find information about companies and employees. Takes natural language queries like 'give me emails from people at Anthropic' or 'find AI companies in San Francisco'",
      request: {
        body: {
          content: {
            "application/json": {
              schema: z.object({
                query: z.string().min(1).describe("Natural language query about companies or employees (e.g., 'give me emails from people at Anthropic', 'find AI companies', 'CTOs at semiconductor companies')"),
              }),
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Agent response with research summary",
          content: {
            "application/json": {
              schema: z.object({
                query: z.string().describe("The original query"),
                summary: z.string().describe("Natural language summary of the research results"),
                state: z.any().optional(),
                error: z.string().optional(),
                errorMessage: z.string().optional(),
              }),
            },
          },
        },
      },
    };

    async handle(c: any) {
      const env = c.env;

      const reqData = await this.getValidatedData<typeof this.schema>();
      const body = JSON.stringify(reqData.body);

      // manually call the agent
      const agent = await getAgentByName(env.FINDER, "main");
      const resp = await agent.fetch(
        new Request("http://internal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        })
      );

      return resp;
    }
  }

// Profile Route
class ProtectedProfileRoute extends OpenAPIRoute {
    schema = {
        tags: ["API"],
        summary: "Get User Profile",
        description: "Get user profile information.",
        responses: {
            "200": {
                description: "User profile retrieved successfully",
                content: {
                    "application/json": {
                        schema: z.object({
                            success: z.boolean(),
                            message: z.string(),
                        }),
                    },
                },
            },
        },
    };

    async handle(c: any) {
        return {
            success: true,
            message: "Profile endpoint - authentication removed",
        };
    }
}

// Create Item Route
class ProtectedCreateItemRoute extends OpenAPIRoute {
    schema = {
        tags: ["API"],
        summary: "Create Item",
        description: "Create a new item (demo endpoint).",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: z.object({
                            name: z.string().min(1).describe("Item name"),
                            description: z.string().optional().describe("Item description"),
                            category: z.string().optional().describe("Item category"),
                        }),
                    },
                },
            },
        },
        responses: {
            "200": {
                description: "Item created successfully",
                content: {
                    "application/json": {
                        schema: z.object({
                            success: z.boolean(),
                            message: z.string(),
                            item: z.object({
                                id: z.string(),
                                name: z.string(),
                                description: z.string().optional(),
                                category: z.string().optional(),
                                createdAt: z.string(),
                            }),
                        }),
                    },
                },
            },
        },
    };

    async handle(c: any) {
        const data = await this.getValidatedData<typeof this.schema>();
        const body = data.body;

        return {
            success: true,
            message: "Item created successfully",
            item: {
                id: crypto.randomUUID(),
                ...body,
                createdAt: new Date().toISOString(),
            },
        };
    }
}

// List Items Route
class ProtectedListItemsRoute extends OpenAPIRoute {
    schema = {
        tags: ["API"],
        summary: "List Items",
        description: "Get all items.",
        responses: {
            "200": {
                description: "Items retrieved successfully",
                content: {
                    "application/json": {
                        schema: z.object({
                            success: z.boolean(),
                            items: z.array(
                                z.object({
                                    id: z.string(),
                                    name: z.string(),
                                    description: z.string(),
                                    createdAt: z.string(),
                                })
                            ),
                            total: z.number(),
                        }),
                    },
                },
            },
        },
    };

    async handle(c: any) {
        return {
            success: true,
            items: [
                {
                    id: "1",
                    name: "Sample Item 1",
                    description: "This is a demo item",
                    createdAt: new Date().toISOString(),
                },
                {
                    id: "2",
                    name: "Sample Item 2",
                    description: "Another demo item",
                    createdAt: new Date().toISOString(),
                },
            ],
            total: 2,
        };
    }
}

// Delete Item Route
class ProtectedDeleteItemRoute extends OpenAPIRoute {
    schema = {
        tags: ["API"],
        summary: "Delete Item",
        description: "Delete an item by ID.",
        request: {
            params: z.object({
                id: z.string().describe("Item ID to delete"),
            }),
        },
        responses: {
            "200": {
                description: "Item deleted successfully",
                content: {
                    "application/json": {
                        schema: z.object({
                            success: z.boolean(),
                            message: z.string(),
                        }),
                    },
                },
            },
        },
    };

    async handle(c: any) {
        const data = await this.getValidatedData<typeof this.schema>();
        const id = data.params.id;

        return {
            success: true,
            message: `Item ${id} deleted successfully`,
        };
    }
}

// Register routes
openapi.get("/api/public/hello", PublicHelloRoute);
openapi.get("/api/public/info", PublicInfoRoute);
openapi.post("/api/public/waitlist", PublicWaitlistRoute);
openapi.get("/api/protected/profile", ProtectedProfileRoute);
openapi.post("/api/protected/items", ProtectedCreateItemRoute);
openapi.get("/api/protected/items", ProtectedListItemsRoute);
openapi.delete("/api/protected/items/:id", ProtectedDeleteItemRoute);
openapi.post("/api/agents/prospects", ProspectorRoute);
openapi.post("/api/agents/peoplefinder", PeopleFinderRoute);
openapi.post("/api/agents/emailfinder", EmailFinderRoute);
openapi.post("/api/agents/orchestrator", OrchestratorRoute);
openapi.post("/api/agents/finder", FinderRoute);
openapi.post("/api/protected/email/send", ProtectedEmailSendRoute);
openapi.post("/api/protected/templates", ProtectedTemplatesCreateRoute);
openapi.get("/api/protected/templates", ProtectedTemplatesListRoute);
openapi.delete("/api/protected/templates/:id", ProtectedTemplatesDeleteRoute);
openapi.put("/api/protected/templates/:id", ProtectedTemplatesUpdateRoute);
openapi.post("/api/protected/templates/process", ProtectedTemplateProcessRoute);
openapi.get("/api/protected/companies", ProtectedCompaniesListRoute);
openapi.get("/api/protected/companies/:id/employees", ProtectedCompanyEmployeesRoute);

// Vectorize Routes
openapi.post("/api/vectorize/populate-companies", VectorizePopulateCompaniesRoute);
openapi.post("/api/vectorize/populate-employees", VectorizePopulateEmployeesRoute);
openapi.get("/api/vectorize/search", VectorizeSearchRoute);
openapi.get("/api/vectorize/stats", VectorizeStatsRoute);
openapi.post("/api/vectorize/update-company/:id", VectorizeUpdateCompanyRoute);


// ============= END DEMO API ROUTES =============


// Simple health check
app.get("/health", c => {
    return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default {
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
      if (!url.pathname.startsWith('/api/')) {
        const agentResponse = await routeAgentRequest(request, env);
        if (agentResponse) return agentResponse;
      }
      return openapi.fetch(request, env, ctx);
    }
  };

export { Prospects, PeopleFinder, EmailFinder, Orchestrator, FinderV2 }; 
