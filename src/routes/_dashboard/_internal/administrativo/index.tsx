import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_dashboard/_internal/administrativo/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_dashboard/_internal/administrativo/"!</div>
}
