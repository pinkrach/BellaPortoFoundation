// PRIVACY: Never display full names, photos, or identifying details of residents.
// Use first names only + anonymized case codes (e.g., C0073).
// All resident data shown publicly must be aggregated and anonymized.

import { AdminLayout } from "@/components/AdminLayout";
import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, User, Filter } from "lucide-react";
import { residents } from "@/data/mockData";

const statusColors: Record<string, string> = {
  Active: "bg-primary/10 text-primary",
  Transferred: "bg-coral/20 text-secondary",
  Closed: "bg-muted text-muted-foreground",
};

const riskColors: Record<string, string> = {
  Low: "bg-sage/20 text-sage",
  Medium: "bg-coral/20 text-secondary",
  High: "bg-destructive/10 text-destructive",
};

const CaseloadInventory = () => {
  const [search, setSearch] = useState("");
  const [filterLocation, setFilterLocation] = useState<string | null>(null);
  const [filterRisk, setFilterRisk] = useState<string | null>(null);

  const locations = [...new Set(residents.map((r) => r.location))];
  const risks = ["Low", "Medium", "High"];

  const filtered = residents.filter((r) => {
    if (search && !r.firstName.toLowerCase().includes(search.toLowerCase()) && !r.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterLocation && r.location !== filterLocation) return false;
    if (filterRisk && r.riskLevel !== filterRisk) return false;
    return true;
  });

  return (
    <AdminLayout>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main content */}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-heading text-2xl font-bold text-foreground">Residents</h2>
              <p className="text-sm text-muted-foreground">Page 1 of 1 · {filtered.length} residents</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search Residents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filtered.map((resident, i) => (
              <motion.div
                key={resident.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl p-5 shadow-warm hover:shadow-warm-hover transition-shadow flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">{resident.firstName}</h3>
                    <span className="text-xs text-muted-foreground">({resident.id})</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[resident.status]}`}>
                      {resident.status}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${riskColors[resident.riskLevel]}`}>
                      {resident.riskLevel} Risk
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Age {resident.age} · {resident.education} · {resident.location}
                  </p>
                </div>
                <button className="shrink-0 px-4 py-2 rounded-full border border-primary text-primary text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors">
                  View
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Filter sidebar */}
        <div className="lg:w-56 shrink-0">
          <div className="bg-card rounded-2xl p-5 shadow-warm sticky top-24">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground text-sm">Filters</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Location</p>
                <div className="flex flex-wrap gap-2">
                  {locations.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => setFilterLocation(filterLocation === loc ? null : loc)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                        filterLocation === loc ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/10"
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Risk Level</p>
                <div className="flex flex-wrap gap-2">
                  {risks.map((risk) => (
                    <button
                      key={risk}
                      onClick={() => setFilterRisk(filterRisk === risk ? null : risk)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                        filterRisk === risk
                          ? risk === "High" ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-primary/10"
                      }`}
                    >
                      {risk}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => { setFilterLocation(null); setFilterRisk(null); }}
                className="text-xs text-primary hover:underline"
              >
                Clear all filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FAB */}
      <button className="fixed bottom-6 right-6 bg-secondary text-secondary-foreground px-5 py-3 rounded-full shadow-warm-lg hover:scale-105 transition-transform flex items-center gap-2 font-semibold text-sm z-30">
        <Plus className="h-5 w-5" />
        Add Resident
      </button>
    </AdminLayout>
  );
};

export default CaseloadInventory;
