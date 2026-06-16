import { OdysseyBrandLockup } from "@/src/components/OdysseyBrandLockup";

type StudioConnexionBrandProps = {
  wordmark: string;
};

export function StudioConnexionBrand({ wordmark }: StudioConnexionBrandProps) {
  return (
    <div className="salon-cinema mb-8 flex w-full justify-center">
      <div className="salon-cinema-logo">
        <OdysseyBrandLockup wordmark={wordmark} size="page" />
      </div>
    </div>
  );
}
