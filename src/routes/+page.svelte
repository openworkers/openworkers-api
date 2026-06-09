<script lang="ts">
  let { data } = $props();
</script>

<svelte:head>
  <title>OpenWorkers API</title>
  <meta name="robots" content="noindex, nofollow" />
  <link rel="icon" href="https://openworkers.com/favicon.ico" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      background: #09090b;
      color: #fafafa;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
  </style>
</svelte:head>

<main>
  <div class="content">
    <div class="header">
      <a href="https://openworkers.com" class="logo">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 283.46 283.46"><path d="m205.14,205.14l-95.11-95.12,31.71-31.71,63.41,63.41,63.38-63.39C245.26,31.89,197.22,0,141.73,0S38.21,31.89,14.94,78.34l95.09,95.1-31.7,31.7L.71,127.52c-.47,4.67-.71,9.41-.71,14.21,0,78.28,63.46,141.73,141.73,141.73s141.73-63.46,141.73-141.73c0-4.8-.24-9.54-.71-14.21l-77.62,77.62Z" fill="white"></path></svg>
        OpenWorkers
      </a>
      <span class="badge">API</span>
    </div>

    <h1>Well, hello there.</h1>

    <p class="description">
      This is the API backend. Not much to see here, but you found it.
    </p>

    <a href={data.dashboardUrl} class="btn">
      Take me to the Dashboard
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    </a>

    <a href="/sign-in" class="btn-secondary">
      Try the beta new UI
      <span class="badge-beta">beta</span>
    </a>
  </div>
</main>

<footer>
  <p>
    <a href="https://openworkers.com">openworkers.com</a> &middot;
    <a href="https://github.com/openworkers">GitHub</a>
  </p>
</footer>

<style>
  main {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .content {
    max-width: 420px;
    text-align: center;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 2.5rem;
  }

  .logo {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    font-weight: 600;
    font-size: 1.1rem;
    color: #fafafa;
    text-decoration: none;
  }

  .logo svg {
    width: 32px;
    height: 32px;
  }

  .badge {
    background: #18181b;
    border: 1px solid #27272a;
    border-radius: 9999px;
    padding: 0.4rem 1rem;
    font-size: 0.8rem;
    font-weight: 500;
    color: #a1a1aa;
  }

  h1 {
    font-size: 2.25rem;
    font-weight: 600;
    letter-spacing: -0.025em;
    line-height: 1.2;
    margin-bottom: 1rem;
  }

  .description {
    color: #71717a;
    font-size: 1.05rem;
    line-height: 1.6;
    margin-bottom: 2.5rem;
  }

  .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.875rem 1.5rem;
    font-size: 0.95rem;
    font-weight: 500;
    color: #09090b;
    background: #fafafa;
    border: none;
    border-radius: 10px;
    text-decoration: none;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn:hover {
    background: #e4e4e7;
  }

  .btn svg {
    transition: transform 0.15s;
  }

  .btn:hover svg {
    transform: translateX(2px);
  }

  .btn-secondary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    margin-top: 0.75rem;
    padding: 0.875rem 1.5rem;
    font-size: 0.95rem;
    font-weight: 500;
    color: #fafafa;
    background: transparent;
    border: 1px solid #27272a;
    border-radius: 10px;
    text-decoration: none;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .btn-secondary:hover {
    background: #18181b;
    border-color: #3f3f46;
  }

  .badge-beta {
    background: #18181b;
    border: 1px solid #27272a;
    border-radius: 9999px;
    padding: 0.1rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 500;
    color: #a1a1aa;
  }

  footer {
    padding: 1.5rem 2rem;
    text-align: center;
    border-top: 1px solid #18181b;
  }

  footer p {
    font-size: 0.8rem;
    color: #52525b;
  }

  footer a {
    color: #71717a;
    text-decoration: none;
    transition: color 0.15s;
  }

  footer a:hover {
    color: #a1a1aa;
  }
</style>
