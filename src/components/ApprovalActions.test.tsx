import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ApprovalActions from './ApprovalActions'
import { useAuthStore } from '@/store/authStore'

// Mock api/client to avoid axios setup
vi.mock('@/api/client', () => ({
  setToken: vi.fn(),
  default: { interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } },
}))

const noop = vi.fn().mockResolvedValue(undefined)

function setRole(role: ReturnType<typeof useAuthStore.getState>['role']) {
  useAuthStore.setState({ role })
}

describe('ApprovalActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: 'tok', user: { id: 1, name: 'Test', email: 't@t.com', role: 'tenant_admin' }, role: 'tenant_admin', isPlatform: false })
  })

  it('shows Submit button when status is draft', () => {
    render(
      <ApprovalActions
        approvalStatus="draft"
        onSubmit={noop}
        onApprove={noop}
        onReject={noop}
      />
    )
    expect(screen.getByText('Submit for Approval')).toBeInTheDocument()
  })

  it('does not show Submit button when already posted', () => {
    render(
      <ApprovalActions
        approvalStatus="draft"
        postingStatus="posted"
        onSubmit={noop}
        onApprove={noop}
        onReject={noop}
      />
    )
    expect(screen.queryByText('Submit for Approval')).not.toBeInTheDocument()
  })

  it('shows Approve and Reject buttons when status is pending_approval and user can approve', () => {
    render(
      <ApprovalActions
        approvalStatus="pending_approval"
        onSubmit={noop}
        onApprove={noop}
        onReject={noop}
      />
    )
    expect(screen.getByText('Approve')).toBeInTheDocument()
    expect(screen.getByText('Reject')).toBeInTheDocument()
  })

  it('does not show Approve/Reject for viewer role', () => {
    setRole('viewer')
    render(
      <ApprovalActions
        approvalStatus="pending_approval"
        onSubmit={noop}
        onApprove={noop}
        onReject={noop}
      />
    )
    expect(screen.queryByText('Approve')).not.toBeInTheDocument()
    expect(screen.queryByText('Reject')).not.toBeInTheDocument()
  })

  it('shows Post button when approved and unposted', () => {
    render(
      <ApprovalActions
        approvalStatus="approved"
        postingStatus="unposted"
        onSubmit={noop}
        onApprove={noop}
        onReject={noop}
        onPost={noop}
      />
    )
    expect(screen.getByText('Post')).toBeInTheDocument()
  })

  it('does not show Post button when no onPost handler', () => {
    render(
      <ApprovalActions
        approvalStatus="approved"
        postingStatus="unposted"
        onSubmit={noop}
        onApprove={noop}
        onReject={noop}
      />
    )
    expect(screen.queryByText('Post')).not.toBeInTheDocument()
  })

  it('opens confirmation dialog when Submit is clicked', async () => {
    render(
      <ApprovalActions
        approvalStatus="draft"
        onSubmit={noop}
        onApprove={noop}
        onReject={noop}
      />
    )
    fireEvent.click(screen.getByText('Submit for Approval'))
    await waitFor(() => {
      expect(screen.getByText('Submit for Approval', { selector: '[role="heading"], h2, [data-slot="dialog-title"]' })).toBeInTheDocument()
    })
  })

  it('calls onSubmit when confirmed', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <ApprovalActions
        approvalStatus="draft"
        onSubmit={onSubmit}
        onApprove={noop}
        onReject={noop}
      />
    )
    fireEvent.click(screen.getByText('Submit for Approval'))
    await waitFor(() => screen.getByText('Confirm'))
    fireEvent.click(screen.getByText('Confirm'))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
  })

  it('Reject Confirm button is disabled when comments are empty (required)', async () => {
    render(
      <ApprovalActions
        approvalStatus="pending_approval"
        onSubmit={noop}
        onApprove={noop}
        onReject={noop}
      />
    )
    fireEvent.click(screen.getByText('Reject'))
    await waitFor(() => screen.getByText('Confirm'))
    expect(screen.getByText('Confirm')).toBeDisabled()
  })
})
