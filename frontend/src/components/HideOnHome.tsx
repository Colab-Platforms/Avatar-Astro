import { useLocation } from "react-router-dom";

/** Renders its children everywhere except the homepage ("/"), which has its own light theme. */
const HideOnHome = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  return pathname === "/" ? null : <>{children}</>;
};

export default HideOnHome;
