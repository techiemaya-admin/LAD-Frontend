import { redirect } from 'next/navigation';

// The basic Master Agent prospect table has been superseded by the richer
// /crm view (same data, full pipeline + detail UI). Redirect to keep the route
// and any existing bookmarks working.
export default function ProspectsRedirect() {
  redirect('/crm');
}
