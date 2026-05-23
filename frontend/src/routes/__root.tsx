import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { lazy, Suspense, useEffect } from "react";
import appCss from "../styles.css?url";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useAuthHydrated } from "@/lib/auth-hydration";
import { ProfileMenu } from "@/components/profile-menu";
const AiChatBubble = lazy(() =>
  import("@/components/ai-chat-bubble").then((m) => ({ default: m.AiChatBubble })),
);
import { RemindersPopover } from "@/components/reminders-popover";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { themeInitScript } from "@/lib/theme";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <Link
          to="/"
          className="inline-flex mt-6 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="inline-flex mt-6 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CareerHub — Cloud Marketing Hub" },
      {
        name: "description",
        content:
          "CareerHub: manage training promotions, evaluate candidates, generate reports — by CMH Cloud Marketing Hub.",
      },
      { property: "og:title", content: "CareerHub" },
      { property: "og:description", content: "HR Training Management System" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/logo.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/logo.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isBrowser = typeof window !== "undefined";
  const hydrated = useAuthHydrated();
  const sessionReady = useAuth((s) => s.sessionReady);
  const isAuth = useAuth((s) => s.isAuthenticated);
  const token = useAuth((s) => s.token);
  const nav = useNavigate();

  const authReady = hydrated && sessionReady;
  const hasSession = isAuth || Boolean(token);

  useEffect(() => {
    if (!isAuth) return;
    void useStore.getState().loadPromotions().catch(console.error);
  }, [isAuth]);

  useEffect(() => {
    if (!isBrowser || !authReady) return;
    if (!hasSession && path !== "/login") {
      nav({ to: "/login", replace: true });
    }
  }, [isBrowser, authReady, hasSession, path, nav]);

  const appShell = (
    <ThemeProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 border-b bg-card flex items-center px-4 gap-3 sticky top-0 z-30">
              <SidebarTrigger />
              <div className="flex-1" />
              <ThemeToggle />
              <RemindersPopover />
              <ProfileMenu />
            </header>
            <main className="flex-1 p-6 pb-24 max-w-[1600px] w-full mx-auto">
              <Outlet />
            </main>
          </div>
        </div>
        <Suspense fallback={null}>
          <AiChatBubble />
        </Suspense>
        <Toaster richColors position="top-right" />
      </SidebarProvider>
    </ThemeProvider>
  );

  if (path === "/login") {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <div className="absolute top-4 right-4 z-50">
            <ThemeToggle />
          </div>
          <Outlet />
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  if (!isBrowser || !authReady) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  if (!hasSession) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
            Redirecting to login…
          </div>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return <QueryClientProvider client={queryClient}>{appShell}</QueryClientProvider>;
}
