# Security policy

ASU reads the credentials that a coding-agent CLI already stored, sends each one only to that provider's usage endpoint, and prints what comes back. Anything that breaks that promise is a security issue.

## No telemetry

ASU touches session credentials, so it has no telemetry and never will. It sends nothing about you, your machine, or your usage to the maintainer or to anyone else. The only signal the project reads is the public download count on npm. The once-a-day update check asks the npm registry for the newest version and sends nothing but the package name. `ASU_NO_UPDATE_CHECK=1` turns it off.

## Report a vulnerability

Use GitHub's private vulnerability reporting: open the [Security tab](https://github.com/allixsenos/asu/security) and choose "Report a vulnerability". Do not open a public issue for a security problem.

Include the ASU version from the report header, the provider, the operating system, and the steps to reproduce. Do not include real tokens, account IDs, or usage reports from your accounts.

You get an acknowledgement within 7 days. A fix for a confirmed issue ships as a patch release on npm. The advisory goes out when the fix is out. There is no bug bounty.

## What counts

- A credential, token, or account ID that reaches stdout, stderr, the cache directory, a log, or any host other than the provider that issued it.
- A request that goes to a host the user did not configure, or over plain HTTP.
- A cache file or directory readable by another user on the machine.
- A provider plugin loaded from anywhere but the path or package the user named on the command line.
- Anything that writes to, refreshes, or deletes a provider's credential store.

## What does not count

- A provider changing its API, rate limiting ASU, or reporting wrong figures. Report those as ordinary issues.
- Usage figures and plan names in a report you chose to share. The report is meant to be readable.
- Behavior of a third-party plugin you loaded. Plugins are trusted local code and run with your permissions.

## Supported versions

Only the newest release on npm receives fixes. `npx --yes @allixsenos/asu@latest` always runs it, and ASU prints a notice once a day when a newer version exists.

## How ASU limits exposure

ASU reads credentials and never logs them. Every request goes over HTTPS to a fixed provider host, and ASU refuses redirects. Before it caches a report, ASU validates it, strips terminal control characters, and redacts any echo of a token or account ID. ASU creates cache files with mode 600 in a directory with mode 700.
