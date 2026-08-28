"use client";

import { useEffect, useRef, useState } from "react";

import {
  PartnersPageIntro,
  type PartnersPageIntroCopy,
} from "@/src/components/partners/PartnersPageIntro";
import { editorialColumn } from "@/src/lib/editorialSkin";
import type { Locale } from "@/i18n.config";

import {
  PartnersLeadForm,
  type PartnersLeadFormLabels,
} from "./PartnersLeadForm";

type PartnersPageContentProps = {
  lang: Locale;
  copy: PartnersPageIntroCopy;
  formLabels: PartnersLeadFormLabels;
};

export function PartnersPageContent({
  lang,
  copy,
  formLabels,
}: PartnersPageContentProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [shouldScroll, setShouldScroll] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  function openForm() {
    setFormOpen(true);
    setShouldScroll(true);
  }

  useEffect(() => {
    if (!shouldScroll || !formRef.current) return;
    formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    setShouldScroll(false);
  }, [shouldScroll, formOpen]);

  return (
    <>
      <PartnersPageIntro copy={copy} onDemoRequest={openForm} />

      {formOpen ? (
        <div
          ref={formRef}
          id="partners-form"
          className={`${editorialColumn} mx-auto mt-20 w-full scroll-mt-28 md:mt-28 md:max-w-[42rem]`}
        >
          <PartnersLeadForm lang={lang} labels={formLabels} />
        </div>
      ) : null}
    </>
  );
}
