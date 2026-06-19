import { OdysseyConnexionMark } from "@/src/components/auth/OdysseyConnexionMark";

type StudioConnexionBrandProps = {
  wordmark: string;
};

export function StudioConnexionBrand({ wordmark }: StudioConnexionBrandProps) {
  return (
    <OdysseyConnexionMark
      wordmark={wordmark}
      animate
      className="mb-8"
    />
  );
}
