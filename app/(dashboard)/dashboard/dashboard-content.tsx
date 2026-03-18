"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  BarChart3,
  Users,
  CheckCircle2,
  Plus,
  ArrowUpRight,
  Clock,
  LayoutDashboard
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from "recharts";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { MetricCard } from "@/components/shared/MetricCard";
import { AvatarStack } from "@/components/shared/AvatarStack";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { EmptyState } from "@/components/shared/empty-state";
import { type DashboardMetrics, type ProjectProgress, type CompletionDataPoint, type StatusBreakdown, type UserWorkload } from "@/lib/dashboard-data";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DashboardContentProps {
  data: {
    session: { user: { name: string; email: string; image?: string | null } };
    metrics: DashboardMetrics;
    projectProgress: ProjectProgress[];
    activity: {
      id: string;
      action: string;
      entity: string;
      user: { name: string; avatar?: string | null };
      createdAt: string;
    }[];
    myTasks: {
      id: string;
      title: string;
      project: { id: string; name: string; color: string };
      dueDate?: string | null;
    }[];
    completionData: CompletionDataPoint[];
    statusBreakdown: StatusBreakdown[];
    userWorkload: UserWorkload[];
  };
}

export function DashboardContent({ data }: DashboardContentProps) {
  const { metrics, projectProgress, activity, myTasks, completionData, statusBreakdown, userWorkload } = data;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen bg-bg-base">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black text-text-primary tracking-tight">
            Dashboard
          </h1>
          <p className="text-text-secondary mt-1 font-medium">
            {format(new Date(), "EEEE, MMMM do")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/projects">
            <Button variant="secondary" size="sm" icon={<Plus className="h-4 w-4" />} className="font-bold border-border-default">
              New Project
            </Button>
          </Link>
          <Link href="/dashboard/tasks">
            <Button size="sm" icon={<LayoutDashboard className="h-4 w-4" />} className="font-bold">
              New Task
            </Button>
          </Link>
        </div>
      </div>

      {/* ── METRICS ── */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <motion.div variants={item}>
          <MetricCard
            label="Total Projects"
            value={metrics.totalProjects}
            trend={{ value: metrics.projectTrend, positive: metrics.projectTrend >= 0 }}
            icon={<LayoutDashboard className="h-5 w-5 text-accent" />}
          />
        </motion.div>
        <motion.div variants={item}>
          <MetricCard
            label="Active Tasks"
            value={metrics.totalTasks}
            trend={{ value: metrics.taskTrend, positive: metrics.taskTrend <= 0 }}
            icon={<BarChart3 className="h-5 w-5 text-amber-500" />}
          />
        </motion.div>
        <motion.div variants={item}>
          <MetricCard
            label="Done This Week"
            value={metrics.completedThisWeek}
            trend={{ value: metrics.completionTrend, positive: metrics.completionTrend >= 0 }}
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          />
        </motion.div>
        <motion.div variants={item}>
          <MetricCard
            label="Team Members"
            value={metrics.teamMembers}
            icon={<Users className="h-5 w-5 text-sky-500" />}
          />
        </motion.div>
      </motion.div>

      {/* ── CHARTS ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Completion Area Chart */}
        <Card className="lg:col-span-2 p-6 h-[400px] flex flex-col shadow-sm border-border-default">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-bold text-text-primary">Task Completion</h3>
            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Last 30 days</span>
          </div>
          <div className="flex-1 w-full text-xs font-bold">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={completionData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontWeight: 700 }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                  tick={{ fontWeight: 700 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e2e8f0",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: 700,
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  fillOpacity={1}
                  fill="url(#colorCount)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Status Donut Chart */}
        <Card className="p-6 h-[400px] flex flex-col shadow-sm border-border-default">
          <h3 className="font-display font-bold text-text-primary mb-6 text-center lg:text-left">Status Breakdown</h3>
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <ResponsiveContainer width="110%" height="110%">
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={8}
                  dataKey="count"
                  nameKey="status"
                  stroke="none"
                >
                  {statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e2e8f0",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: 700,
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Legend */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <span className="text-3xl font-black text-text-primary">
                {statusBreakdown.reduce((acc, curr) => acc + curr.count, 0)}
              </span>
              <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mt-1">Tasks</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6">
            {statusBreakdown.map((s) => (
              <div key={s.status} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-bg-hover/50 border border-border-default shadow-sm">
                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-[10px] text-text-secondary uppercase tracking-tight font-black truncate">
                  {s.status.replace('_', ' ')}: {s.count}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* User Workload Bar Chart */}
        <Card className="p-6 h-[400px] flex flex-col shadow-sm border-border-default">
          <h3 className="font-display font-bold text-text-primary mb-6">Team Workload</h3>
          <div className="flex-1 w-full relative">
            {userWorkload.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center -mt-8">
                <p className="text-[11px] font-black uppercase tracking-widest text-text-muted italic">No active tasks assigned.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userWorkload} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid stroke="#f1f5f9" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }} width={80} />
                  <Tooltip
                    cursor={{ fill: "rgba(0,0,0,0.02)" }}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                    }}
                  />
                  <Bar dataKey="tasks" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={26}>
                    {userWorkload.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6"][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* ── PROJECT PROGRESS ── */}
      <section className="space-y-6 pt-4">
        <h3 className="text-xl font-display font-bold text-text-primary flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-accent" />
          Project Overview
        </h3>
        {projectProgress.length === 0 ? (
          <EmptyState
            icon={<LayoutDashboard className="h-10 w-10 text-accent/20" />}
            title="No projects yet"
            description="Create your first project to start tracking progress."
            action={
              <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />}>
                Create Project
              </Button>
            }
          />
        ) : (
          <div className="flex overflow-x-auto pb-4 gap-6 scrollbar-hide -mx-2 px-2">
            {projectProgress.map((project) => (
              <Card key={project.id} className="min-w-[300px] p-6 shrink-0 group hover:border-accent/40 shadow-sm hover:shadow-lg transition-all duration-300 border-border-default bg-surface rounded-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-bg-hover flex items-center justify-center text-xl shadow-inner border border-border-default group-hover:bg-accent-light group-hover:scale-110 transition-all">
                      {project.emoji || "📁"}
                    </div>
                    <span className="font-black text-text-primary group-hover:text-accent transition-colors">
                      {project.name}
                    </span>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-text-muted group-hover:text-accent opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </div>

                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between text-[11px] font-black mb-2 uppercase tracking-widest">
                      <span className="text-text-muted">{project.doneTasks} / {project.totalTasks} Done</span>
                      <span className="text-text-primary">
                        {project.totalTasks > 0 ? Math.round((project.doneTasks / project.totalTasks) * 100) : 0}%
                      </span>
                    </div>
                    <ProgressBar
                      value={project.totalTasks > 0 ? (project.doneTasks / project.totalTasks) * 100 : 0}
                      color={project.color}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <AvatarStack avatars={project.members} max={3} size="sm" />
                    <Link href={`/dashboard/projects/${project.id}`} className="text-[10px] text-accent hover:text-accent-hover uppercase tracking-[0.2em] font-black transition-colors px-3 py-1.5 rounded-lg bg-accent-light border border-accent/10">
                      Explore &rarr;
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ── BOTTOM ROW: ACTIVITY & MY TASKS ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <Card className="p-6 flex flex-col shadow-sm border-border-default">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-display font-bold text-text-primary">Recent Activity</h3>
            <Link href="/dashboard/activity">
              <span className="text-[10px] font-black uppercase text-accent hover:text-accent-hover tracking-widest">View History</span>
            </Link>
          </div>
          <div className="space-y-6 flex-1">
            {activity.map((log) => (
              <div key={log.id} className="flex gap-4 group">
                <div className="relative flex flex-col items-center">
                  <div className="h-9 w-9 rounded-xl bg-bg-hover border border-border-default flex items-center justify-center shrink-0 shadow-sm group-hover:bg-accent-light group-hover:border-accent/20 transition-all">
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-sm text-text-secondary leading-tight">
                    <span className="font-black text-text-primary">{log.user.name}</span>{" "}
                    <span className="font-medium">{log.action.replace('_', ' ').toLowerCase()}</span>{" "}
                    <span className="font-black text-accent">{log.entity}</span>
                  </p>
                  <p className="text-[10px] font-bold text-text-muted mt-1.5 uppercase tracking-tight flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {format(new Date(log.createdAt), "MMM d, h:mm a")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* My Tasks */}
        <Card className="p-6 flex flex-col shadow-sm border-border-default">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-display font-bold text-text-primary">Assigned to Me</h3>
            <Link href="/dashboard/tasks">
              <span className="text-[10px] font-black uppercase text-accent hover:text-accent-hover tracking-widest">Go to Board</span>
            </Link>
          </div>
          <div className="space-y-2 flex-1">
            {myTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center bg-bg-hover/50 rounded-2xl border border-dashed border-border-default">
                <CheckCircle2 className="h-10 w-10 text-emerald-500/20 mb-4" />
                <p className="text-sm font-black text-text-muted uppercase tracking-widest italic">All caught up!</p>
              </div>
            ) : (
              myTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 rounded-2xl hover:bg-bg-hover transition-all duration-300 border border-transparent hover:border-border-default group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className="h-2 w-2 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: task.project.color }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm text-text-primary font-black truncate group-hover:text-accent transition-colors">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-text-muted font-black uppercase tracking-widest">
                          {task.project.name}
                        </span>
                        {task.dueDate && (
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-tight flex items-center gap-1.5 px-2 py-0.5 rounded-md shadow-sm border transition-all",
                            new Date(task.dueDate) < new Date()
                              ? "bg-danger-bg text-danger border-danger/20"
                              : "bg-warning-bg text-warning border-warning/20"
                          )}>
                            <Clock className="h-2.5 w-2.5" />
                            {format(new Date(task.dueDate), "MMM d")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Link href={`/dashboard/projects/${task.project.id}?taskId=${task.id}`}>
                    <Button variant="secondary" size="sm" className="opacity-0 group-hover:opacity-100 transition-all font-black border-border-default hover:bg-surface">
                      Open
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
