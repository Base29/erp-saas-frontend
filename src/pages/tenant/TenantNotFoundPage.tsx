import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, RefreshCw, ServerOff } from 'lucide-react'

interface TenantNotFoundPageProps {
  subdomain: string
}

export default function TenantNotFoundPage({ subdomain }: TenantNotFoundPageProps) {
  const currentHost = window.location.host

  const handleRetry = () => {
    window.location.reload()
  }

  const handleGoHome = () => {
    window.location.href = 'https://getgeniecloud.com'
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-background">
      {/* Background Volumetric Mesh Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-destructive/10 dark:bg-destructive/20 blur-3xl pointer-events-none -z-10 animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-primary/10 dark:bg-primary/15 blur-3xl pointer-events-none -z-10 animate-float" />

      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md border-border/60 shadow-2xl backdrop-blur-xl bg-card/90">
        <CardHeader className="text-center pb-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 flex items-center justify-center text-destructive mb-4 shadow-inner">
            <ServerOff className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Organization Not Found</CardTitle>
          <CardDescription className="text-sm mt-1.5 text-muted-foreground">
            We couldn't locate an active workspace matching this address.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5 text-center space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Requested Workspace
            </span>
            <div className="flex items-center justify-center gap-1.5 font-mono text-sm font-semibold text-foreground">
              <Building2 className="w-4 h-4 text-primary" />
              <span>{subdomain}</span>
              <span className="text-muted-foreground">.{currentHost.split('.').slice(1).join('.')}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            There is currently no tenant provisioned by the name <strong className="text-foreground">"{subdomain}"</strong>.
            Please verify the subdomain or contact your administrator to provision this organization.
          </p>

          <div className="space-y-2.5 pt-2">
            <Button
              variant="outline"
              onClick={handleRetry}
              className="w-full h-10 rounded-xl gap-2 text-xs font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Check Again
            </Button>

            <Button
              variant="default"
              onClick={handleGoHome}
              className="w-full h-10 rounded-xl gap-2 text-xs font-semibold"
            >
              Go to Genie Cloud Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
