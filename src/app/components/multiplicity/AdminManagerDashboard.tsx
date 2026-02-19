import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Users, UserCheck, Calendar, Clock } from "lucide-react";
import { useAllManagers, useAllReps, useAllCalls, useAllScheduledCalls } from "../../../services/hooks";

export function AdminManagerDashboard() {
  const { data: managersData } = useAllManagers();
  const { data: repsData } = useAllReps();
  const { data: callsData } = useAllCalls();
  const { data: scheduledData } = useAllScheduledCalls();

  const managers = (managersData as any[]) || [];
  const reps = (repsData as any[]) || [];
  const calls = (callsData as any[]) || [];
  const scheduledCalls = (scheduledData as any[]) || [];

  const getChicagoDateKey = (value: string | Date) => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  };

  const todayChicagoKey = getChicagoDateKey(new Date());

  const repNameById = new Map(
    reps.map((rep) => [rep.id, rep.name || "Unknown Rep"])
  );

  const managerRows = managers.map((manager) => {
    const teamReps = reps.filter((rep) => rep.manager_id === manager.id);
    const teamRepIds = new Set(teamReps.map((rep) => rep.id));

    const teamCalls = calls.filter((call) => call.rep_id && teamRepIds.has(call.rep_id));
    const teamTodaySchedules = scheduledCalls
      .filter((call) => call.rep_id && teamRepIds.has(call.rep_id))
      .filter((call) => {
        if (!call.scheduled_date) return false;
        return getChicagoDateKey(call.scheduled_date) === todayChicagoKey;
      })
      .sort(
        (a, b) =>
          new Date(a.scheduled_date || 0).getTime() -
          new Date(b.scheduled_date || 0).getTime()
      )
      .map((call) => ({
        id: call.id,
        rep: repNameById.get(call.rep_id) || "Unknown Rep",
        customer: call.customer_name || "Unknown Customer",
        company: call.company || "Unknown Company",
        type: call.call_type || "Call",
        time: call.scheduled_date
          ? new Date(call.scheduled_date).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
              timeZone: "America/Chicago",
            })
          : "TBD",
      }));

    return {
      id: manager.id,
      name: manager.name,
      email: manager.email,
      teamName: manager.team_name || "Unassigned Team",
      repCount: teamReps.length,
      callsCount: teamCalls.length,
      todayScheduleCount: teamTodaySchedules.length,
      todaySchedules: teamTodaySchedules,
      lastCallAt: teamCalls.length
        ? new Date(
            teamCalls
              .map((call) => call.started_at || call.created_at)
              .filter(Boolean)
              .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
          ).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "No calls yet",
    };
  });

  const managersWithSchedules = managerRows.filter((manager) => manager.todayScheduleCount > 0).length;
  const totalTodaySchedules = managerRows.reduce((sum, manager) => sum + manager.todayScheduleCount, 0);

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <div className="bg-gradient-to-r from-[#1e3a8a] to-[#1e40af] text-white px-8 py-8 shadow-2xl border-b border-cyan-500/20">
        <div className="max-w-[1600px] mx-auto">
          <h1 className="text-3xl font-bold mb-2 text-cyan-400">Admin Manager Schedules</h1>
          <p className="text-cyan-200">Today&apos;s schedules grouped by manager</p>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="grid grid-cols-4 gap-6 mb-8">
          <Card className="p-6 border border-cyan-500/30 bg-[#1e293b] shadow-lg shadow-cyan-500/10">
            <p className="text-sm font-medium text-gray-400 mb-1">Total Managers</p>
            <p className="text-3xl font-bold text-white">{managers.length}</p>
          </Card>
          <Card className="p-6 border border-cyan-500/30 bg-[#1e293b] shadow-lg shadow-cyan-500/10">
            <p className="text-sm font-medium text-gray-400 mb-1">Managers With Schedule Today</p>
            <p className="text-3xl font-bold text-white">{managersWithSchedules}</p>
          </Card>
          <Card className="p-6 border border-cyan-500/30 bg-[#1e293b] shadow-lg shadow-cyan-500/10">
            <p className="text-sm font-medium text-gray-400 mb-1">Total Schedules Today</p>
            <p className="text-3xl font-bold text-white">{totalTodaySchedules}</p>
          </Card>
          <Card className="p-6 border border-cyan-500/30 bg-[#1e293b] shadow-lg shadow-cyan-500/10">
            <p className="text-sm font-medium text-gray-400 mb-1">Total Reps</p>
            <p className="text-3xl font-bold text-white">{reps.length}</p>
          </Card>
        </div>

        <div className="space-y-4">
          {managerRows.map((manager) => (
            <Card key={manager.id} className="p-5 border border-cyan-500/30 bg-[#1e293b] shadow-lg shadow-cyan-500/10">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{manager.name}</h3>
                  <p className="text-sm text-gray-400">{manager.email}</p>
                  <Badge className="mt-2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    {manager.teamName}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 min-w-[360px]">
                  <div className="rounded-lg border border-cyan-500/20 bg-[#0f172a] px-3 py-2">
                    <div className="flex items-center gap-2 text-cyan-300 text-xs mb-1"><Users className="w-3 h-3" /> Team Reps</div>
                    <div className="text-white font-semibold">{manager.repCount}</div>
                  </div>
                  <div className="rounded-lg border border-cyan-500/20 bg-[#0f172a] px-3 py-2">
                    <div className="flex items-center gap-2 text-cyan-300 text-xs mb-1"><Calendar className="w-3 h-3" /> Today Schedules</div>
                    <div className="text-white font-semibold">{manager.todayScheduleCount}</div>
                  </div>
                  <div className="rounded-lg border border-cyan-500/20 bg-[#0f172a] px-3 py-2">
                    <div className="flex items-center gap-2 text-cyan-300 text-xs mb-1"><UserCheck className="w-3 h-3" /> Last Team Call</div>
                    <div className="text-white font-semibold">{manager.lastCallAt}</div>
                  </div>
                  <div className="rounded-lg border border-cyan-500/20 bg-[#0f172a] px-3 py-2">
                    <div className="flex items-center gap-2 text-cyan-300 text-xs mb-1"><Users className="w-3 h-3" /> Team Calls</div>
                    <div className="text-white font-semibold">{manager.callsCount}</div>
                  </div>
                </div>
              </div>

              <div className="border-t border-cyan-500/20 pt-4">
                <h4 className="text-sm font-semibold text-cyan-300 mb-3">Today&apos;s Team Schedule</h4>
                {manager.todaySchedules.length > 0 ? (
                  <div className="space-y-2">
                    {manager.todaySchedules.map((call) => (
                      <div key={call.id} className="rounded-lg border border-cyan-500/20 bg-[#0f172a] px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-white">{call.customer} • {call.company}</p>
                            <p className="text-xs text-gray-400">Rep: {call.rep}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-cyan-300 text-xs justify-end">
                              <Clock className="w-3 h-3" />
                              <span>{call.time}</span>
                            </div>
                            <Badge variant="outline" className="text-xs border-cyan-500/40 text-cyan-300 mt-1">
                              {call.type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No schedule for today.</p>
                )}
              </div>
            </Card>
          ))}

          {managerRows.length === 0 && (
            <Card className="p-10 border border-cyan-500/20 bg-[#1e293b] text-center text-gray-400">
              No managers found.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
