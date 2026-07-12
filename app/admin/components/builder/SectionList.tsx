"use client";

import { Reorder, useDragControls, type DragControls } from "framer-motion";
import type { BuilderSection } from "@/app/lib/pageBuilder/types";

function DraggableItem<T extends BuilderSection>({
  section,
  children,
}: {
  section: T;
  children: (dragControls: DragControls) => React.ReactNode;
}) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item
      value={section}
      dragListener={false}
      dragControls={dragControls}
      className="list-none"
      // Keep the dragged card above its siblings and give it a lift while
      // it's moving — the "smooth drag animation" + "visual drop indicator"
      // requirements, via framer-motion's built-in layout animation rather
      // than a hand-rolled drop-indicator line.
      whileDrag={{ scale: 1.02, boxShadow: "0 12px 28px rgba(11,37,96,0.18)", zIndex: 20 }}
    >
      {children(dragControls)}
    </Reorder.Item>
  );
}

export default function SectionList<T extends BuilderSection>({
  sections,
  onReorder,
  renderSection,
}: {
  sections: T[];
  onReorder: (next: T[]) => void;
  renderSection: (section: T, index: number, dragControls: DragControls) => React.ReactNode;
}) {
  return (
    <Reorder.Group axis="y" values={sections} onReorder={onReorder} className="space-y-3">
      {sections.map((section, i) => (
        <DraggableItem key={section.id} section={section}>
          {(dragControls) => renderSection(section, i, dragControls)}
        </DraggableItem>
      ))}
    </Reorder.Group>
  );
}
