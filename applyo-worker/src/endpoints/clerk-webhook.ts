import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { Webhook } from "svix";
import { drizzle } from "drizzle-orm/d1";
import { schema } from "../db";
import { users } from "../db/auth.schema";
import { eq } from "drizzle-orm";

interface ClerkUserEvent {
  data: {
    id: string;
    email_addresses: Array<{
      email_address: string;
      id: string;
    }>;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
  };
  type: string;
}

export class ClerkWebhookRoute extends OpenAPIRoute {
  schema = {
    tags: ["Webhooks"],
    summary: "Clerk Webhook Handler",
    description: "Handles Clerk webhook events for user sync",
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.any(),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Webhook processed successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
            }),
          },
        },
      },
      "400": {
        description: "Invalid webhook signature",
      },
    },
  };

  async handle(c: any) {
    const env = c.env;
    const request = c.req.raw;

    const WEBHOOK_SECRET = env.CLERK_WEBHOOK_SECRET;
    if (!WEBHOOK_SECRET) {
      console.error("CLERK_WEBHOOK_SECRET is not set");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    // Get headers for verification
    const svix_id = request.headers.get("svix-id");
    const svix_timestamp = request.headers.get("svix-timestamp");
    const svix_signature = request.headers.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    // Get raw body for verification
    const body = await request.text();

    // Verify webhook signature
    const wh = new Webhook(WEBHOOK_SECRET);
    let evt: ClerkUserEvent;

    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as ClerkUserEvent;
    } catch (err) {
      console.error("Webhook verification failed:", err);
      return new Response("Invalid signature", { status: 400 });
    }

    // Handle user events
    if (evt.type === "user.created" || evt.type === "user.updated") {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;
      
      const email = email_addresses[0]?.email_address || "";
      const name = [first_name, last_name].filter(Boolean).join(" ") || null;

      const db = drizzle(env.DB, { schema });

      try {
        // Upsert user
        await db
          .insert(users)
          .values({
            clerkUserId: id,
            email,
            name,
            image: image_url,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: users.clerkUserId,
            set: {
              email,
              name,
              image: image_url,
              updatedAt: new Date(),
            },
          });

        console.log(`User ${evt.type}: ${id}`);
      } catch (error) {
        console.error("Error upserting user:", error);
        return new Response("Database error", { status: 500 });
      }
    }

    if (evt.type === "user.deleted") {
      const { id } = evt.data;
      const db = drizzle(env.DB, { schema });

      try {
        await db.delete(users).where(eq(users.clerkUserId, id));
        console.log(`User deleted: ${id}`);
      } catch (error) {
        console.error("Error deleting user:", error);
        return new Response("Database error", { status: 500 });
      }
    }

    return { success: true };
  }
}





