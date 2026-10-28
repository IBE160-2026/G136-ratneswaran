"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { Result } from "@/lib/result";
import { undoToast } from "@/lib/feedback";
import { inviteToRole, setRoleLead, type InviteStatus } from "@/modules/events/actions";
import { callSafely } from "@/modules/events/save";
import { secondaryClass } from "@/components/form";
import { InviteForm, InviteLink } from "./invite-form";

export type Member = {
  id: string;
  roleId: string;
  roleName: string;
  roleActive: boolean;
  name: string;
  email: string;
  joined: boolean;
  isLead: boolean;
};

/** The people on the Event's Roles. Pending rows offer *New link* and *Correct email*; any row *Make lead*. */
export function PeopleList({
  eventId,
  members,
  readOnly,
}: {
  eventId: string;
  members: Member[];
  readOnly: boolean;
}) {
  const t = useTranslations("events.team.people");
  const [correcting, setCorrecting] = useState<Member | null>(null);
  return (
    <>
      {correcting && (
        <section aria-label={t("correctEmailLabel", { name: correcting.name })}>
          <InviteForm
            key={correcting.id}
            eventId={eventId}
            roles={[{ id: correcting.roleId, name: correcting.roleName }]}
            initial={correcting}
            replaces={correcting.id}
            onClose={() => {
              setCorrecting(null);
              // Back to the row's Correct email; after a correction that row is gone, so to the list heading.
              requestAnimationFrame(() =>
                (
                  document.getElementById(`correct-${correcting.id}`) ??
                  document.getElementById("people")
                )?.focus(),
              );
            }}
          />
        </section>
      )}
      {members.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul role="list" className="divide-border flex flex-col divide-y">
          {members.map((member) => (
            <PersonRow
              key={member.id}
              eventId={eventId}
              member={member}
              readOnly={readOnly}
              previousLeadId={
                members.find((m) => m.roleId === member.roleId && m.isLead)?.id ?? null
              }
              onCorrect={() => setCorrecting(member)}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function PersonRow({
  eventId,
  member,
  readOnly,
  previousLeadId,
  onCorrect,
}: {
  eventId: string;
  member: Member;
  readOnly: boolean;
  previousLeadId: string | null;
  onCorrect: () => void;
}) {
  const t = useTranslations();
  const [outcome, setOutcome] = useState<Result<{
    status: InviteStatus;
    token: string | null;
  }> | null>(null);
  const [pending, startTransition] = useTransition();
  const [leadFailure, setLeadFailure] = useState<string | null>(null);
  const newLink = () =>
    startTransition(async () => {
      setLeadFailure(null);
      setOutcome(
        await callSafely(() =>
          inviteToRole({
            eventId,
            roleId: member.roleId,
            name: member.name,
            email: member.email,
          }),
        ),
      );
    });
  const changeLead = (memberId: string | null, onDone?: () => void) =>
    startTransition(async () => {
      setLeadFailure(null);
      setOutcome((previous) => (previous?.ok ? previous : null));
      const result = await callSafely(() =>
        setRoleLead({ eventId, roleId: member.roleId, memberId }),
      );
      if (result.ok) onDone?.();
      else setLeadFailure(result.error.message);
    });
  const makeLead = () =>
    changeLead(member.id, () =>
      undoToast(
        t("events.team.lead.changed", { name: member.name, role: member.roleName }),
        () => changeLead(previousLeadId),
        t("feedback.undo"),
      ),
    );
  const done = outcome?.ok ? outcome.data : null;
  return (
    <li className="flex flex-col gap-2 py-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <span className="min-w-0 break-words">{member.name}</span>
        <span className="text-muted-foreground">{member.roleName}</span>
        {member.isLead && member.roleActive && (
          <span className="text-subhead text-primary font-semibold">
            {t("events.team.lead.badge")}
          </span>
        )}
        <span className="text-subhead text-muted-foreground ml-auto">
          {t(member.joined ? "events.team.people.joined" : "events.team.people.pending")}
        </span>
        {!readOnly && member.roleActive && !member.isLead && (
          <button
            type="button"
            aria-label={t("events.team.lead.makeLabel", {
              name: member.name,
              role: member.roleName,
            })}
            className={secondaryClass}
            onClick={makeLead}
            aria-busy={pending}
            disabled={pending}
          >
            {t("events.team.lead.make")}
          </button>
        )}
        {!readOnly && !member.joined && member.roleActive && (
          <span className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-label={t("events.team.people.newLinkLabel", { name: member.name })}
              className={secondaryClass}
              onClick={newLink}
              aria-busy={pending}
              disabled={pending}
            >
              {t("events.team.people.newLink")}
            </button>
            <button
              type="button"
              id={`correct-${member.id}`}
              aria-label={t("events.team.people.correctEmailLabel", { name: member.name })}
              className={secondaryClass}
              onClick={onCorrect}
            >
              {t("events.team.people.correctEmail")}
            </button>
          </span>
        )}
      </div>
      {done?.token ? (
        <InviteLink token={done.token} name={member.name} onDone={() => setOutcome(null)} />
      ) : (
        done && (
          <p role="status">
            {t(`events.team.invite.status.${done.status}`, { name: member.name })}
          </p>
        )
      )}
      {leadFailure && (
        <p role="alert" className="text-destructive">
          {t(leadFailure)}
        </p>
      )}
      {outcome && !outcome.ok && (
        <p role="alert" className="text-destructive">
          {t(outcome.error.message)}
        </p>
      )}
    </li>
  );
}
