import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function ModuleNotActivePage() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <h1 className="text-2xl font-semibold">Module Not Active</h1>
      <p className="text-muted-foreground max-w-sm">
        This module is not currently active for your account. Contact your platform administrator to
        enable it.
      </p>
      <Button variant="outline" onClick={() => navigate('/dashboard')}>
        Back to Dashboard
      </Button>
    </div>
  )
}
