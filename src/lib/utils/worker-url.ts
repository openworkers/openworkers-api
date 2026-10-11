/**
 * The public URL of a worker: `<name>.<workerDomain>` when the domain is
 * configured, otherwise from the host of the dashboard: a dev host
 * (`dash.dev.localhost`) gives `<name>.workers.dev.localhost`, any other host
 * gives `<name>.workers.rocks`.
 */
export function workerUrl(name: string, dashboardHost: string, workerDomain?: string | null): string {
  if (workerDomain) {
    return `https://${name}.${workerDomain}`;
  }

  const hostname = dashboardHost.replace(/:\d+$/, '');
  const labels = hostname.split('.');

  if (labels.includes('dev')) {
    return `https://${name}.workers.${labels.slice(-2).join('.')}`;
  }

  return `https://${name}.workers.rocks`;
}
