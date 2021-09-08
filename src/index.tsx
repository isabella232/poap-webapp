import React from 'react';
import { ToastProvider } from 'react-toast-notifications';
import ReactDOM from 'react-dom';
import App from './App';
import { authClient } from './auth';
import * as serviceWorker from './serviceWorker';
import './scss/main.scss';
import './poap-eth';
import AOS from 'aos';
import * as Sentry from "@sentry/react";
import { Integrations } from "@sentry/tracing";

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DNS,
  integrations: [new Integrations.BrowserTracing()],
  environment: process.env.REACT_APP_SENTRY_ENVIRONMENT,
  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 0.2,
});

async function main() {
  await authClient.init();
  AOS.init({
    once: true,
  });
  ReactDOM.render(
    <ToastProvider>
      <App auth={authClient} />
    </ToastProvider>,
    document.getElementById('root'),
  );
}

main().catch((err) => {
  console.error('Error starting app');
  console.error(err);
});

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
