import { addDays, format, subDays } from "date-fns";
import { useStore } from "./store";
import type { EducationLevel } from "./types";

const firstNames = ["Yasmine", "Karim", "Sofia", "Mehdi", "Lina", "Omar", "Aya", "Youssef", "Salma", "Hamza", "Imane", "Reda", "Nora", "Ayoub", "Hajar", "Anas", "Sara", "Bilal", "Fatima", "Zineb"];
const lastNames = ["El Amrani", "Benali", "Tazi", "Bennani", "Cherkaoui", "Idrissi", "Alaoui", "El Fassi", "Berrada", "Lahlou", "Saadi", "El Mansouri", "Chraibi", "Boukhriss", "El Khatib"];
const educations: EducationLevel[] = ["Bac", "Bac+2", "Bac+3", "Bac+5"];
const diplomas = ["Marketing Digital", "Génie Logiciel", "Commerce", "Management", "Informatique", "Communication"];

const rand = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const randF = (min: number, max: number, dec = 1) =>
  Math.round((Math.random() * (max - min) + min) * 10 ** dec) / 10 ** dec;

export const seedSampleData = () => {
  const s = useStore.getState();
  if (s.seeded || s.promotions.length > 0) return;

  const today = new Date();
  const promos = [
    { name: "Digital Marketing Bootcamp", start: format(subDays(today, 12), "yyyy-MM-dd") },
    { name: "Sales Training Q4", start: format(subDays(today, 90), "yyyy-MM-dd") },
    { name: "Customer Service Excellence", start: format(addDays(today, 5), "yyyy-MM-dd") },
  ];

  const created = promos.map((p) => s.addPromotion({ name: p.name, startDate: p.start }));

  const counts = [15, 20, 18];
  created.forEach((promo, idx) => {
    const count = counts[idx];
    for (let i = 0; i < count; i++) {
      const fn = rand(firstNames);
      const ln = rand(lastNames);
      const email = `${fn.toLowerCase().replace(/\s/g, "")}.${ln.toLowerCase().replace(/\s/g, "")}${i}@cmh.ma`;
      const res = useStore.getState().addCandidate({
        promotionId: promo.id,
        firstName: fn,
        lastName: ln,
        email,
        phone: `+212 6${Math.floor(10000000 + Math.random() * 89999999)}`,
        recruitmentDate: format(subDays(today, Math.floor(Math.random() * 200) + 30), "yyyy-MM-dd"),
        educationLevel: rand(educations),
        diplomaName: rand(diplomas),
        diplomaAverage: randF(10, 18),
      });
      if (!res.ok) continue;
      const candidates = useStore.getState().candidates;
      const c = candidates[candidates.length - 1];

      // Distribute scores per category target
      const r = Math.random();
      const targetAvg = r < 0.2 ? randF(16, 19) : r < 0.5 ? randF(14, 16) : r < 0.85 ? randF(10, 14) : randF(5, 10);

      const skillVal = Math.min(5, Math.max(0, targetAvg / 4 + randF(-0.3, 0.3)));
      useStore.getState().setSkills(c.id, {
        communication: Math.round(skillVal * 2) / 2,
        technical: Math.round((skillVal + randF(-0.5, 0.5)) * 2) / 2,
        teamwork: Math.round((skillVal + randF(-0.5, 0.5)) * 2) / 2,
        problemSolving: Math.round((skillVal + randF(-0.5, 0.5)) * 2) / 2,
        adaptability: Math.round((skillVal + randF(-0.5, 0.5)) * 2) / 2,
      });

      const numTests = idx === 1 ? 5 : Math.floor(Math.random() * 4) + 1;
      const testNames = ["Theory Test", "Practice Test 1", "Practice Test 2", "Practice Test 3", "Final Test"];
      for (let t = 0; t < numTests; t++) {
        useStore.getState().addTest(c.id, {
          name: testNames[t],
          score: Math.min(20, Math.max(0, Math.round((targetAvg + randF(-2, 2)) * 100) / 100)),
          date: format(subDays(today, Math.floor(Math.random() * 30)), "yyyy-MM-dd"),
        });
      }

      // Mark some modules done for completed/active promos
      const elapsedDays = idx === 1 ? 25 : idx === 0 ? 8 : 0;
      for (let d = 1; d <= elapsedDays; d++) {
        useStore.getState().updateModule(c.id, d, {
          status: "Completed",
          score: Math.min(20, Math.max(0, Math.round((targetAvg + randF(-2, 2)) * 100) / 100)),
          participation: Math.round(skillVal),
          discipline: Math.round(skillVal),
        });
      }

      // A few terminations / dismissals
      if (i === 2 && idx === 1) useStore.getState().changeStatus(c.id, "Terminated");
      if (i === 5 && idx === 1) useStore.getState().changeStatus(c.id, "Dismissed");
      if (i === 1 && idx === 0) useStore.getState().changeStatus(c.id, "Dismissed");
      if (idx === 1 && targetAvg >= 10 && i !== 2 && i !== 5) {
        useStore.getState().changeStatus(c.id, "Graduated");
      }
    }
  });

  useStore.setState({ seeded: true });
};
