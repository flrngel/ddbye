# Service definition

## Product type

A founder / sales tool that turns a messy target brief into:

1. a due diligence summary
2. a defensible outreach angle
3. a channel-specific deliverable

It is not just an email writer.

## Core promise

The user should be able to type a rough target description in natural language and receive a result that answers:

- Who is this person really?
- What organization, service, or surface actually matters?
- What is the right wedge for my objective?
- What should I send as an email or DM?

## Primary user

- founder doing sales or partnership outreach
- founder doing investor targeting
- senior sales operator working high-value accounts

## Non-goals

- high-volume outbound sequencing
- CRM management
- generic AI copywriting
- backend-heavy workflow automation in the MVP

## Core jobs to be done

### Job 1: resolve the target

The user often provides incomplete or fuzzy target descriptions.

The system must turn that into:

- person
- organization
- relevant product or business surface

### Job 2: expand the context

The system must research:

- target background that matters
- product or firm context
- likely motivations
- likely objections
- timing or wedge signals

### Job 3: map the user's objective to the target

The system must understand the sender-side context too:

- what the sender is offering
- what the sender wants
- which parts of the sender story matter for this target

### Job 4: write the deliverable only after diligence

The final output should include:

- title / framing
- subject lines if email
- final draft
- short follow-up
- alternative channel version

## User-facing object model

The product should not expose campaigns and prospects first.

The main user-facing object is a **request**.

A request contains:

- messy target brief
- objective
- sender offer / context
- preferred channel
- research focus

The rest can stay internal.
