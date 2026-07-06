// Twin of Demo 1's menu-declaration fence: the eight-
// section contract-dev business-management menu as
// plggmatic data. Each entry names the collection it
// opens; `schedule` derives the navigable program from it.
import { menu, menuEntry } from "plggmatic";

export const bizMenu = menu([
  menuEntry("Dashboard", "dashboard"),
  menuEntry("Projects", "projects"),
  menuEntry("Clients", "clients"),
  menuEntry("Estimates & Contracts", "deals"),
  menuEntry("Timesheets", "timesheets"),
  menuEntry("Invoices", "invoices"),
  menuEntry("Members", "members"),
  menuEntry("Reports", "reports"),
]);
