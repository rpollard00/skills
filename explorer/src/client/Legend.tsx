import { useEffect, useRef, type ReactNode } from "react";
import { GATE } from "../shared/polyline";
import { LEGEND, weightOf, wordOf, type CableClass } from "../shared/view/cable-class";
import { GLYPHS } from "../shared/view/scene";
import { ChangedMark, GLYPH_NAMES, GlyphShape, MarkShape } from "./SkillMap";

const NOTES: { readonly [Cls in CableClass]: string | null } = {
  flow: null,
  cite: null,
  reads: null,
  aside: null,
  avoid: null,
  unjudged: "not judged",
};

const Sample = ({ children }: { readonly children: ReactNode }): ReactNode => (
  <svg className="legend-sample map-sample" width={30} height={14} viewBox="-15 -7 30 14" aria-hidden="true" focusable="false">
    {children}
  </svg>
);

const ARROW_HEAD = "M7,-3.2L12,0L7,3.2";

export interface LegendProps {
  readonly muted: ReadonlySet<CableClass>;
  readonly onMute: (cls: CableClass) => void;
  readonly onClose: () => void;
}

export const Legend = ({ muted, onMute, onClose }: LegendProps): ReactNode => {
  const firstSwitch = useRef<HTMLButtonElement | null>(null);
  useEffect(() => firstSwitch.current?.focus(), []);

  return (
    <aside
      className="legend"
      aria-label="Key"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        onClose();
      }}
    >
      <ul aria-label="Nodes">
        {GLYPHS.map((glyph) => (
          <li key={glyph}>
            <Sample>
              <g className="node" data-glyph={glyph} data-tone="rest">
                <GlyphShape glyph={glyph} />
              </g>
            </Sample>
            {GLYPH_NAMES[glyph]}
          </li>
        ))}
        <li>
          <Sample>
            <g className="node" transform="translate(10 0)">
              <path className="tick" data-mako="route" d="M-13.6,-3L-8.6,0L-13.6,3Z" />
              <path className="tick" data-mako="trigger" d="M-23.6,-3L-18.6,0L-23.6,3Z" />
            </g>
          </Sample>
          the router triggers it, routes to it
        </li>
        <li>
          <Sample>
            <g className="node">
              <MarkShape kind="script" x={-10} />
              <MarkShape kind="command" x={0} />
            </g>
          </Sample>
          bundled script, shell command
        </li>
        <li>
          <Sample>
            <g className="node" data-glyph="ring" data-tone="rest" transform="translate(-4 2)">
              <GlyphShape glyph="ring" />
              <ChangedMark reach={5.5} />
            </g>
          </Sample>
          changed after the last index
        </li>
      </ul>
      <ul aria-label="Cables">
        <li className="legend-title">Cables. Select a row to hide its cables.</li>
        {LEGEND.map(({ cls, kinds }, index) => (
          <li key={cls}>
            <button type="button" className="legend-switch" ref={index === 0 ? firstSwitch : undefined} aria-pressed={!muted.has(cls)} onClick={() => onMute(cls)}>
              <Sample>
                <path className="legend-line" data-weight={weightOf(cls)} d="M-14,0H12" />
                <path className={cls === "avoid" ? "legend-line bar" : "legend-line head"} d={cls === "avoid" ? "M12,-5.5V5.5" : ARROW_HEAD} />
              </Sample>
              <span>
                {kinds.map(wordOf).join(", ")}
                {NOTES[cls] === null ? "" : ` (${NOTES[cls]})`}
              </span>
            </button>
          </li>
        ))}
        <li>
          <Sample>
            <path className="legend-line" data-weight="strong" d="M-14,0H12" />
            <circle className="legend-line gate" cx={0} r={GATE.radius} />
            <path className="legend-line head" d={ARROW_HEAD} />
          </Sample>
          with a condition
        </li>
        <li>
          <Sample>
            <path className="legend-line" data-weight="strong" d="M-14,0H12" />
            <path className="legend-line head needed-by" d="M-7,-3.2L-12,0L-7,3.2" />
            <path className="legend-line head" d={ARROW_HEAD} />
          </Sample>
          it also needs the selection
        </li>
        <li>
          <Sample>
            <path className="legend-line" data-weight="strong" d="M-14,0H12" />
            <path className="legend-line head needed-by closed" d="M-7,-3.2L-12,0L-7,3.2Z" />
            <path className="legend-line head" d={ARROW_HEAD} />
          </Sample>
          it also needs the selection, with a condition
        </li>
      </ul>
      <ul aria-label="Selection">
        <li>
          <Sample>
            <path className="legend-line needs" d={`M-14,0H12${ARROW_HEAD}`} />
          </Sample>
          the selection needs it
        </li>
        <li>
          <Sample>
            <path className="legend-line needed-by" d={`M-14,0H12${ARROW_HEAD}`} />
          </Sample>
          it needs the selection
        </li>
        <li>
          <Sample>
            <path className="stage-frame" d="M-14,0H12" />
          </Sample>
          how a locked view is arranged
        </li>
        <li>
          <Sample>
            <g className="node" data-tone="step">
              <circle className="step-disc" cx={-7} r={5.5} />
              <circle className="step-disc conditional" cx={7} r={5.5} />
            </g>
          </Sample>
          step of a trace, step with a condition
        </li>
      </ul>
    </aside>
  );
};
