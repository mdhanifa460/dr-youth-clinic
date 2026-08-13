import { connectDB } from './mongodb';
import { Doctor } from '../models/Doctor';
import Appointment from '../models/Appointment';
import DoctorSlotBlock from '../models/DoctorSlotBlock';
import { getEffectiveBranchConfig } from './branchConfig';
import { addMinutes } from './appointmentFlow';

export interface DoctorAvailabilityResult {
  open: boolean;
  reason?: 'holiday' | 'closed_day' | 'not_configured';
  holidayLabel?: string;
  doctors: Array<{ id: string; name: string; title: string; available: boolean }>;
}

// Real per-doctor availability for one exact date+time — same conflict
// logic as the admin-only single-doctor check
// (app/api/admin/appointments/check-availability/route.ts), generalized
// to "which of this branch's active doctors are free", and gated by the
// branch's own operating hours/holidays first (a closed branch means every
// doctor is "unavailable" for the honest reason of being closed, not
// individually booked out).
//
// This checks the real Appointment/DoctorSlotBlock CRM records — the
// clinic's actual scheduling truth — never invents availability. A doctor
// with zero Appointment/DoctorSlotBlock rows for that date is reported
// available; that's a correct absence-of-conflict result, not a guess.
export async function getDoctorAvailability(
  location: string,
  date: string, // YYYY-MM-DD
  time: string, // HH:MM, 24-hour
  durationMinutes?: number
): Promise<DoctorAvailabilityResult> {
  await connectDB();

  const branchConfig = await getEffectiveBranchConfig(location);
  const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date(date + 'T00:00:00').getDay()];

  const holiday = (branchConfig.holidays || []).find((h: any) => h.date === date);
  if (holiday) {
    return { open: false, reason: 'holiday', holidayLabel: holiday.label, doctors: [] };
  }
  const hoursForDay = (branchConfig.operatingHours || []).find((h: any) => h.day === weekday);
  if (!hoursForDay) {
    return { open: false, reason: 'not_configured', doctors: [] };
  }
  if (!hoursForDay.isOpen) {
    return { open: false, reason: 'closed_day', doctors: [] };
  }

  const duration = durationMinutes || branchConfig.bookingRules?.consultationDuration || 30;
  const endTime = addMinutes(time, duration);

  const activeDoctors = await (Doctor as any)
    .find({ locations: { $in: [location, 'all'] }, active: true })
    .select('name title order')
    .sort({ order: 1 })
    .lean();

  const doctors = await Promise.all(
    activeDoctors.map(async (doc: any) => {
      const [apptConflict, blockConflict] = await Promise.all([
        (Appointment as any).findOne({
          doctorId: doc._id,
          date,
          status: { $nin: ['cancelled', 'no_show'] },
          startTime: { $lt: endTime },
          endTime: { $gt: time },
        }).select('_id').lean(),
        (DoctorSlotBlock as any).findOne({
          doctorId: doc._id,
          date,
          startTime: { $lt: endTime },
          endTime: { $gt: time },
        }).select('_id').lean(),
      ]);
      return {
        id: String(doc._id),
        name: doc.name,
        title: doc.title,
        available: !apptConflict && !blockConflict,
      };
    })
  );

  return { open: true, doctors };
}
