import { useEffect, useRef, type Ref } from "react";

type HubInviteLabelsProps = {
  prompt: string;
  tapHint?: string;
  promptRef?: Ref<HTMLParagraphElement>;
  tapRef?: Ref<HTMLParagraphElement>;
};

/**
 * T-invite Option C — typo droite au bord du halo (DOM, hors WebGL).
 * pointer-events: none — hitbox = bouton parent.
 */
export function HubInviteLabels({
  prompt,
  tapHint,
  promptRef,
  tapRef,
}: HubInviteLabelsProps) {
  return (
    <>
      <p ref={promptRef} className="hub-invite-prompt" aria-hidden>
        {prompt}
      </p>
      {tapHint ? (
        <p ref={tapRef} className="hub-invite-tap" aria-hidden>
          {tapHint}
        </p>
      ) : null}
    </>
  );
}
