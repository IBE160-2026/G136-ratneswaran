---
title: "Product Brief: Arrangly"
status: final
created: 2026-09-20
updated: 2026-09-21
---

# Product Brief: Arrangly

## Executive Summary

Arrangly is a web platform for people who run events with many moving parts. It turns an event into a managed project: people, roles, responsibilities, tasks and timelines in one place, so the organizer leads instead of chasing.

Its primary user is the amateur organizer: the person who ends up in charge of a 40th birthday, a wedding party or an office party for 80 guests, with friends and colleagues helping. Existing tools cover pieces of the job (invitations, RSVPs, task lists), but none supports the people who actually make the event happen. Arrangly's core promise is that the right things happen in the right order and everyone knows their part. The organizer manages, role-holders do, and progress is visible without asking.

Roles are the mechanism. The organizer assigns roles (food, technical, toastmaster), and each role carries its own tasks and its own view of the event. Guests get a separate, simple side for RSVP, allergies and practical information. AI helps draft the plan; the organizer stays in control.

Arrangly is built as a course project, delivered as a working web application within 70 days using the BMAD method. Scope is tiered so that a complete, demonstrable core is guaranteed and ambition can grow with the time available.

## The Problem

Anyone who has organized a large event knows the feeling. A 40th birthday for 80 guests or a wedding party is a small project: venue, catering, DJ, decorations, seating, speeches, a run of show. Every part depends on other parts, and some must be booked months ahead. The seating chart waits for final RSVPs, the bar menu waits for the caterer, the decorating crew waits for venue access. Timing and order decide whether the event works.

Amateur organizers cope with a patchwork of tools, each solving only part of the problem: email for RSVPs, a Facebook event for information, a separate webpage for interactive details and the gift register, Excel for organizing, group chats for everything else. Nothing connects them. The plan, the people and the progress live in different places, and mostly in the organizer's head.

The result is that the organizer ends up doing the work instead of leading it. When delegating is hard and tracking is harder, tasks go undelegated, progress is invisible until someone is asked, and one person carries the whole event. The cost is rarely money. It is burnout, friction with friends who were asked for favors and then chased, and a worse night for everyone.

## The Solution

Arrangly makes the event the hub that connects guests, helpers, tasks, timeline and communication.

**A team with roles.** When an event is created, the organizer builds a team around it and assigns roles: food lead, finance, toastmaster, technical, decorating. Users cannot pick roles for themselves. Each role determines what a person can see and change (role-based access control, RBAC). The same person can hold different roles in different events, and a guest can also hold a role, so a birthday guest can help plan without seeing the surprise.

**Tasks that know their order.** Each task has an owner (a person or a role), a deadline, a status and, where needed, a dependency on another task. Blocked and overdue work is visible at a glance. Owners update status with one tap.

**Clear for role-holders.** A role-holder is often a friend doing a favor, so the tool must make the job obvious. The organizer invites them by link; they register with contact and login details, land on their role and tasks, and can mark work done or stuck. Each task states its scope and what is expected. Role-holders also see how their part fits the whole: who else is on the team and in which time window. If the decorating team is three people in a two-hour window, two people cannot each arrive 90 minutes late. A shared matrix of everyone's commitments synchronizes the effort and creates accountability without the organizer nagging.

**An organizer dashboard.** This is the organizer's most important tool. One view shows what is done, overdue, blocked and in need of follow-up, plus a prioritized list of decisions to make and tasks to do or delegate. The organizer knows the state of the event and what to do next without messaging anyone.

**A simple guest side.** Guests accept or decline, manage plus-ones, register allergies and read the program and practical information. The organizer sees the aggregated guest data relevant to planning.

**Two timelines, linked.** A plan timeline covers everything leading up to the event; a run of show covers the event itself.

**Communication tied to the organization.** The organizer can message a person, a role or a group, for example everyone on the technical team.

**AI as a planning assistant.** From a short description of the event, AI proposes roles, tasks and, later, a timeline planned backward from the event date. The organizer accepts, edits or rejects every suggestion.

## What Makes This Different

Arrangly is not an RSVP tool and not a generic task manager. It is built around the event as the unit of work, and around the gap left by the tools people use today: the organizer cannot delegate confidently or see progress, and order and timing are tracked nowhere.

Three things set it apart:

- **Roles are the access model, not just labels.** Responsibility and permission are the same thing. Each person sees and can do only what fits their role in that event.
- **Order and timing are first-class.** Dependencies between tasks, and later lead times planned backward from the event date, address what made large events hard in practice.
- **AI gives decision support, not just text.** It understands how parts of the event relate. Example: adding a DJ implies a booking, music wishes, equipment, a soundcheck and a slot in the run of show.

None of these is a technical moat. The advantage is focus on the amateur organizer running a complex event, and integration of roles, tasks and timing in one place.

## Who This Serves

**Primary: the event organizer.** An amateur leading a team for a complex event, such as a wedding party, a milestone birthday, a student julebord or a club event. They need to know what must be done, who owns it, what is late and what follows from a change. Success means understanding the state of the event without contacting each person.

**Secondary: the role-holder.** A friend or colleague responsible for part of the event, such as food or technical. They see only their own tasks, deadlines and relevant information, with as little friction as possible.

**Secondary: the guest.** Someone invited who wants to reply, share allergies and find information without seeing the organizer's internal planning.

## Success Criteria

**Delivery**
- A deployed, working web application by day 70.
- The flagship scenario, a 40th birthday for 80 guests (venue, dinner, speeches, quiz, DJ), can be run end to end with three personas: organizer, role-holder and guest.

**Product**
- The organizer creates an event, assigns, changes and revokes roles, and creates tasks with owners, deadlines, statuses and dependencies.
- RBAC holds: users cannot assign themselves roles or widen their own access, and cannot see or change what their role does not permit.
- The organizer can tell what is done, late or blocked, and what to decide or delegate next, from the dashboard alone.
- A guest can RSVP, manage a plus-one and register allergies; the organizer sees the aggregate.
- Core tier is complete and stable before any Target work begins.

**Qualitative**
- The organizer feels better informed than with spreadsheets, messages and notes.
- A first-time role-holder can, after registering, find their tasks and understand what is expected of them within about a minute.

## Scope

**Core: must work**
- Event creation and management; users and participants
- Roles and RBAC; only the organizer can assign, change or revoke roles
- Tasks and subtasks with owner (person or role), deadlines, status and basic dependencies
- Organizer dashboard with a prioritized list of decisions and tasks to do or delegate
- Role-holder view showing task scope, expectations and the team's time windows
- Full team matrix: everyone's commitments across roles and time windows in one shared view
- Role-holder invitation by link, with registration and login required
- Guest invitation, RSVP, plus-ones, allergies and food preferences
- Basic plan timeline and run of show
- Simple messaging to people, roles and groups
- Simple AI suggestion of roles and tasks from an event description

**Target: if the core is stable**
- AI backward-planned timeline with dependencies and lead times
- Reminders to role-holders
- Guest information page and announcements

**Stretch: only with time to spare**
- AI detection of gaps in the plan (for example, a DJ without a soundcheck)
- Impact of delays on the run of show, with organizer approval
- Guest-count changes rippling into food, staffing and budget
- AI-proposed guest program with descriptions, shown in the guest view
- Gift register

**Out of scope**
- Supplier marketplace and booking, payments, ticketing, accounting
- Face recognition, photo gallery, crowdfunding gifts
- Integrations with external calendar, messaging or payment services
- Native mobile apps; very large festivals or conferences

**Difficulty and risk.** The project is hard where it should be: multi-role RBAC per event, dependency-aware planning, and AI that reasons about the event. Risk is contained by the tiers. The full team matrix is the first Core item to reassess once the PRD and architecture are done and, if the core is at risk, the first to move to Target. If time runs short, cuts come from the bottom and a working, complete platform remains.

## Vision

Over time, Arrangly becomes an operating system for events. A user starts with one sentence:

> "We're throwing a 40th birthday for 80 people in October. We've booked a venue and want dinner, speeches, a quiz and a DJ."

Arrangly drafts the team, roles, tasks and a timeline planned backward from the date, and the organizer adjusts it. As plans change, Arrangly explains the consequences: more guests affect food, staffing and budget, and a late task shows what it blocks. During the event, the organizer sees what is happening now and what is next, and approves any adjusted run of show before it goes to the people affected.

The long-term ambition is a platform that does not just store information about an event but understands how its parts fit together: from the first idea to the last guest going home.
