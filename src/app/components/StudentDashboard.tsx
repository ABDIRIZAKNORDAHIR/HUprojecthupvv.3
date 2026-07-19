import { ProjectAtlas } from "./ProjectAtlas";
import type { ViewId } from "../types";

interface StudentDashboardProps {
  activeView: ViewId;
}

export function StudentDashboard({ activeView }: StudentDashboardProps) {
  return <ProjectAtlas role="student" />;
}
