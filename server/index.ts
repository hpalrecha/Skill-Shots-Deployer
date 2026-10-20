import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { storage } from "./storage";

const app = express();
const httpServer = createServer(app);

// Trust proxy for production (Replit runs behind a reverse proxy)
app.set('trust proxy', 1);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

const PgSession = connectPgSimple(session);

app.use(
  session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "skillshots-secret-key-2024",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  })
);

app.use(
  express.json({
    limit: '50mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '50mb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse && res.statusCode >= 400) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse).slice(0, 300)}`;
      }

      log(logLine);
    }
  });

  next();
});

async function seedDemoData() {
  try {
    // Check if SuperAdmin exists
    const superAdmin = await storage.getUserByEmail("superadmin@skillshots.com");
    if (!superAdmin) {
      await storage.createUser({
        name: "Super Admin",
        email: "superadmin@skillshots.com",
        password: "superadmin123",
        role: "SuperAdmin",
        groupIds: [],
      });
      log("Created SuperAdmin account");
    }

    // Check if license plans exist
    const plans = await storage.getAllLicensePlans();
    if (plans.length === 0) {
      await storage.createLicensePlan({
        name: "Starter",
        description: "Perfect for small teams getting started",
        priceMonthly: "99",
        priceYearly: "990",
        maxUsers: 25,
        maxCreators: 3,
        maxCourses: 50,
        maxStorageMb: 5000,
        features: { analytics: true, customBranding: false, apiAccess: false, ssoIntegration: false },
        isActive: true,
      });
      await storage.createLicensePlan({
        name: "Professional",
        description: "For growing organizations",
        priceMonthly: "299",
        priceYearly: "2990",
        maxUsers: 100,
        maxCreators: 10,
        maxCourses: 200,
        maxStorageMb: 20000,
        features: { analytics: true, customBranding: true, apiAccess: true, ssoIntegration: false },
        isActive: true,
      });
      await storage.createLicensePlan({
        name: "Enterprise",
        description: "Full-featured for large enterprises",
        priceMonthly: "999",
        priceYearly: "9990",
        maxUsers: 999999,
        maxCreators: 999999,
        maxCourses: 999999,
        maxStorageMb: 100000,
        features: { analytics: true, customBranding: true, apiAccess: true, ssoIntegration: true },
        isActive: true,
      });
      log("Created default license plans");
    }

    // Check if "justsigns" organization exists
    const existingOrg = await storage.getOrganizationBySlug("justsigns");
    if (!existingOrg) {
      // Create the organization
      const org = await storage.createOrganization({
        name: "JustSigns",
        slug: "justsigns",
        description: "Sign language learning organization",
        isActive: true,
      });
      log("Created JustSigns organization");

      // Get Starter plan for the license
      const starterPlan = (await storage.getAllLicensePlans()).find(p => p.name === "Starter");
      if (starterPlan) {
        await storage.createOrganizationLicense({
          organizationId: org.id,
          planId: starterPlan.id,
          status: "active",
          currentUsers: 2,
          currentCourses: 0,
        });
        log("Created license for JustSigns organization");
      }

      // Create OrgAdmin user
      const adminUser = await storage.createUser({
        name: "JustSigns Admin",
        email: "admin@justsigns.com",
        password: "admin123",
        role: "OrgAdmin",
        organizationId: org.id,
        groupIds: [],
      });
      log("Created JustSigns admin user");

      // Create admin membership
      await storage.createOrganizationMembership({
        organizationId: org.id,
        userId: adminUser.id,
        role: "admin",
      });

      // Create Learner user
      const learnerUser = await storage.createUser({
        name: "John Learner",
        email: "learner@justsigns.com",
        password: "learner123",
        role: "Learner",
        organizationId: org.id,
        groupIds: [],
      });
      log("Created JustSigns learner user");

      // Create learner membership
      await storage.createOrganizationMembership({
        organizationId: org.id,
        userId: learnerUser.id,
        role: "member",
      });

      log("JustSigns demo organization setup complete");
    }
  } catch (error) {
    log(`Seed data error: ${error}`);
  }
}

(async () => {
  await registerRoutes(httpServer, app);
  
  // Seed demo data
  await seedDemoData();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Unhandled error:", err);
    if (res.headersSent) {
      return;
    }
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
