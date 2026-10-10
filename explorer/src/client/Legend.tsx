import { useEffect, useRef, type ReactNode } from "react";
import { LEGEND, type CableClass } from "../shared/view/cable-class";
import { GLYPHS } from "../shared/view/scene";
import { GLYPH_NAMES, GlyphShape, MarkShape } from "./SkillMap";

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

export interface LegendProps {
  readonly muted: ReadonlySet<CableClass>;
  readonly onMute: (cls: CableClass) => void;
  readonly onClose: () => void;
}

/**
 * The key to the marks. Each cable row is a switch that hides its class.
 * The first switch takes the focus when the Key opens, and Escape closes the Key: the switches are the only controls here.
 */
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
      </ul>
      <ul aria-label="Cables">
        <li className="legend-title">Cables. Select a row to hide its cables.</li>
        {LEGEND.map(({ cls, kinds }, index) => (
          <li key={cls}>
            <button type="button" className="legend-switch" ref={index === 0 ? firstSwitch : undefined} aria-pressed={!muted.has(cls)} onClick={() => onMute(cls)}>
              <Sample>
                <path className="cable legend-line" data-cls={cls} d="M-14,0H12" />
                {cls === "avoid" ? <path className="legend-line bar" d="M12,-5.5V5.5" /> : null}
              </Sample>
              <span>
                {kinds.join(", ")}
                {NOTES[cls] === null ? "" : ` (${NOTES[cls]})`}
              </span>
            </button>
          </li>
        ))}
        <li>
          <Sample>
            <path className="cable legend-line" data-cls="flow" data-conditional="true" d="M-14,0H12" />
          </Sample>
          conditional
        </li>
      </ul>
      <ul aria-label="Selection">
        <li>
          <Sample>
            <path className="legend-line needs" d="M-14,0H12M7,-3.2L12,0L7,3.2" />
          </Sample>
          the selection needs it
        </li>
        <li>
          <Sample>
            <path className="legend-line needed-by" d="M-14,0H12M7,-3.2L12,0L7,3.2" />
          </Sample>
          it needs the selection
        </li>
      </ul>
    </aside>
  );
};
