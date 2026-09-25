# Source playbooks

The why skill spawns one investigator per available evidence category, each reading a single source-specific playbook below. The playbooks are concrete examples for common MCPs. Adapt them for a different MCP in the same category.

- Source control history
  - Playbook: [`code-archaeology.md`](sources/code-archaeology.md)
  - Example MCP it documents: git, `gh`
- Issue / ticket tracker
  - Playbook: [`linear.md`](sources/linear.md)
  - Example MCP it documents: Linear (adapt for Jira, GitHub Issues, Plane, Shortcut)
- Long-form documents
  - Playbook: [`notion.md`](sources/notion.md)
  - Example MCP it documents: Notion (adapt for Confluence, Google Docs, Coda)
- Real-time team chat
  - Playbook: [`slack.md`](sources/slack.md)
  - Example MCP it documents: Slack (adapt for Discord, Microsoft Teams, Mattermost)
- Infrastructure observability
  - Playbook: [`datadog.md`](sources/datadog.md)
  - Example MCP it documents: Datadog (adapt for New Relic, Honeycomb, Grafana, Splunk)
- Error / exception tracking
  - Playbook: [`sentry.md`](sources/sentry.md)
  - Example MCP it documents: Sentry (adapt for Rollbar, Bugsnag, Airbrake)
- Product analytics warehouse
  - Playbook: [`databricks.md`](sources/databricks.md)
  - Example MCP it documents: Databricks SQL (adapt for Snowflake, BigQuery, ClickHouse, dbt)

Cross-cutting:

- [`incident-postmortem.md`](sources/incident-postmortem.md). Add this if the target code looks defensive (null checks, retry, timeout, rate limit, feature flag, egress guard, OOM handler).
