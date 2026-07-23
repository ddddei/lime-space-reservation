import { useEffect } from "react";
import { X } from "lucide-react";
import type { HelpSection } from "../data/helpContent";

type HelpModalProps = {
  readonly title: string;
  readonly description: string;
  readonly sections: readonly HelpSection[];
  readonly onClose: () => void;
};

export function HelpModal({ title, description, sections, onClose }: HelpModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="ui-modal-scrim fixed inset-0 z-50 grid p-3 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      onMouseDown={onClose}
    >
      <div
        className="ui-modal-panel mx-auto grid max-h-[calc(100dvh-24px)] w-full max-w-2xl overflow-hidden rounded-2xl md:max-h-[calc(100dvh-48px)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-4 md:p-5">
          <div>
            <p className="text-xs font-black text-[#5F9820]">이용 안내</p>
            <h2 id="help-modal-title" className="mt-1 text-2xl font-black text-[#172014]">
              {title}
            </h2>
            <p className="mt-1 text-sm text-[#5B6856]">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ui-button ui-button-ghost whitespace-nowrap"
            aria-label="도움말 닫기"
          >
            <X size={16} strokeWidth={2.3} />
            닫기
          </button>
        </div>
        <div className="grid gap-4 overflow-y-auto p-4 md:p-5">
          {sections.map((section) => (
            <section key={section.title} className="ui-card-soft rounded-2xl p-4">
              <h3 className="text-lg font-black text-[#172014]">{section.title}</h3>
              <ul className="mt-2 grid gap-1.5 text-sm leading-6 text-[#5B6856]">
                {section.body.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
