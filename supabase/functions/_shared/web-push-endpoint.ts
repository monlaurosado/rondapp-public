// Keep this policy aligned with private.is_allowed_web_push_endpoint in SQL.
// Only browser push services may receive outbound requests; user-provided hosts,
// credentials, ports, fragments, control characters and backslashes are rejected.
const allowedEndpoint = new RegExp(
  "^https://(fcm[.]googleapis[.]com|updates[.]push[.]services[.]mozilla[.]com|[a-z0-9-]+[.]push[.]apple[.]com|[a-z0-9-]+[.]notify[.]windows[.]com)/[A-Za-z0-9_~!$&()*+,;=:@%/?-]+$",
);

export function isAllowedWebPushEndpoint(
  endpoint: unknown,
): endpoint is string {
  return typeof endpoint === "string" && endpoint.length >= 20 &&
    endpoint.length <= 4096 && !/[\s\\]/.test(endpoint) &&
    allowedEndpoint.test(endpoint);
}
