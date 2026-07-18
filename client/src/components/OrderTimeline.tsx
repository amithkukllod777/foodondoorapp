/**
 * OrderTimeline — visual step-by-step order tracking timeline.
 * Horizontal on desktop (md+), vertical on mobile.
 *
 * DB status enum: pending_payment | placed | processing | shipped | delivered | cancelled
 * Also handles: pending, confirmed, out_for_delivery, returned
 */

import {
  ShoppingBag,
  CheckCircle,
  Package,
  Truck,
  MapPin,
  Home,
  XCircle,
  RotateCcw,
} from "lucide-react";

interface TimelineStep {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const STEPS: TimelineStep[] = [
  { key: "placed", label: "Order Placed", icon: ShoppingBag },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "processing", label: "Packed", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "out_for_delivery", label: "Out for Delivery", icon: MapPin },
  { key: "delivered", label: "Delivered", icon: Home },
];

/** Map DB status → step index (0-based) */
const STATUS_TO_STEP: Record<string, number> = {
  pending_payment: -1, // before step 0
  pending: 0,
  placed: 0,
  confirmed: 1,
  processing: 2,
  shipped: 3,
  out_for_delivery: 4,
  delivered: 5,
};

interface OrderTimelineProps {
  status: string;
  timestamps?: Record<string, string>;
}

export default function OrderTimeline({ status, timestamps }: OrderTimelineProps) {
  const isCancelled = status === "cancelled";
  const isReturned = status === "returned";
  const currentStep = STATUS_TO_STEP[status] ?? -1;

  if (isCancelled) {
    return <CancelledTimeline />;
  }

  if (isReturned) {
    return <ReturnedTimeline />;
  }

  return (
    <>
      {/* Desktop: horizontal */}
      <div className="hidden md:block">
        <HorizontalTimeline
          steps={STEPS}
          currentStep={currentStep}
          timestamps={timestamps}
        />
      </div>
      {/* Mobile: vertical */}
      <div className="md:hidden">
        <VerticalTimeline
          steps={STEPS}
          currentStep={currentStep}
          timestamps={timestamps}
        />
      </div>
    </>
  );
}

/* ──────────────── Cancelled state ──────────────── */

function CancelledTimeline() {
  return (
    <div className="flex items-center justify-center gap-3 py-4">
      <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center ring-4 ring-red-100/60">
        <XCircle size={20} />
      </div>
      <span className="text-sm font-semibold text-red-600">Order Cancelled</span>
    </div>
  );
}

/* ──────────────── Returned state ──────────────── */

function ReturnedTimeline() {
  return (
    <div className="flex items-center justify-center gap-3 py-4">
      <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center ring-4 ring-orange-100/60">
        <RotateCcw size={20} />
      </div>
      <span className="text-sm font-semibold text-orange-600">Order Returned</span>
    </div>
  );
}

/* ──────────────── Horizontal (desktop) ──────────────── */

function HorizontalTimeline({
  steps,
  currentStep,
  timestamps,
}: {
  steps: TimelineStep[];
  currentStep: number;
  timestamps?: Record<string, string>;
}) {
  return (
    <div className="flex items-start justify-between w-full">
      {steps.map((step, i) => {
        const done = i <= currentStep;
        const isCurrent = i === currentStep;
        const isLast = i === steps.length - 1;
        const Icon = step.icon;
        const ts = timestamps?.[step.key];

        return (
          <div key={step.key} className="flex items-start flex-1 last:flex-none">
            {/* Circle + label column */}
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  done
                    ? isCurrent
                      ? "bg-nutrigreen text-white ring-4 ring-nutrigreen/20 animate-pulse"
                      : "bg-nutrigreen text-white"
                    : "bg-gray-200 text-gray-400 border-2 border-dashed border-gray-300"
                }`}
              >
                <Icon size={18} />
              </div>
              <span
                className={`text-[11px] font-medium mt-1.5 text-center max-w-[72px] leading-tight ${
                  done ? "text-nutrigreen" : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
              {ts && (
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {ts}
                </span>
              )}
            </div>

            {/* Connecting line */}
            {!isLast && (
              <div className="flex-1 mt-5 mx-1">
                <div
                  className={`h-0.5 w-full ${
                    i < currentStep
                      ? "bg-nutrigreen"
                      : "border-t-2 border-dashed border-gray-300"
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ──────────────── Vertical (mobile) ──────────────── */

function VerticalTimeline({
  steps,
  currentStep,
  timestamps,
}: {
  steps: TimelineStep[];
  currentStep: number;
  timestamps?: Record<string, string>;
}) {
  return (
    <div className="flex flex-col">
      {steps.map((step, i) => {
        const done = i <= currentStep;
        const isCurrent = i === currentStep;
        const isLast = i === steps.length - 1;
        const Icon = step.icon;
        const ts = timestamps?.[step.key];

        return (
          <div key={step.key} className="flex items-start">
            {/* Circle + vertical line */}
            <div className="flex flex-col items-center mr-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  done
                    ? isCurrent
                      ? "bg-nutrigreen text-white ring-4 ring-nutrigreen/20 animate-pulse"
                      : "bg-nutrigreen text-white"
                    : "bg-gray-200 text-gray-400 border-2 border-dashed border-gray-300"
                }`}
              >
                <Icon size={18} />
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 h-8 ${
                    i < currentStep
                      ? "bg-nutrigreen"
                      : "border-l-2 border-dashed border-gray-300"
                  }`}
                />
              )}
            </div>

            {/* Label + timestamp */}
            <div className="pt-2.5">
              <span
                className={`text-[11px] font-medium leading-tight ${
                  done ? "text-nutrigreen" : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
              {ts && (
                <span className="block text-[10px] text-muted-foreground mt-0.5">
                  {ts}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
