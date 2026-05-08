import { addDays, format, subDays } from "date-fns";
import { useStore } from "./store";
import type { EducationLevel, Skills } from "./types";

const firstNames = ["Yasmine", "Karim", "Sofia", "Mehdi", "Lina", "Omar", "Aya", "Youssef", "Salma", "Hamza", "Imane", "Reda", "Nora", "Ayoub", "Hajar", "Anas", "Sara", "Bilal", "Fatima", "Zineb"];
const lastNames = ["El Amrani", "Benali", "Tazi", "Bennani", "Cherkaoui", "Idrissi", "Alaoui", "El Fassi", "Berrada", "Lahlou", "Saadi", "El Mansouri", "Chraibi", "Boukhriss", "El Khatib"];
const educations: EducationLevel[] = ["Bac", "Bac+2", "Bac+3", "Bac+5"];
const diplomas = ["Marketing Digital", "Génie Logiciel", "Commerce", "Management", "Informatique", "Communication"];

const rand = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const randF = (min: number, max: number, dec = 1) =>
  Math.round((Math.random() * (max - min) + min) * 10 ** dec) / 10 ** dec;
const round5 = (n: number) => Math.min(5, Math.max(0, Math.round(n * 2) / 2));

export const seedSampleData = () => {
  const s = useStore.getState();
  if (s.seeded || s.promotions.length > 0) return;

  const today = new Date();
  const promos = [
    { name: "Email Marketing Bootcamp", start: format(subDays(today, 12), "yyyy-MM-dd") },
    { name: "Email Marketing Q4", start: format(subDays(today, 90), "yyyy-MM-dd") },
    { name: "Email Marketing — New Cohort", start: format(addDays(today, 5), "yyyy-MM-dd") },
  ];

  const created = promos.map((p) => s.addPromotion({ name: p.name, startDate: p.start }));

  const counts = [15, 20, 18];
  created.forEach((promo, idx) => {
    const count = counts[idx];
    for (let i = 0; i < count; i++) {
      const fn = rand(firstNames);
      const ln = rand(lastNames);
      const email = `${fn.toLowerCase().replace(/\s/g, "")}.${ln.toLowerCase().replace(/\s/g, "")}${i}${idx}@cmh.ma`;
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

      const r = Math.random();
      const targetAvg = r < 0.2 ? randF(16, 19) : r < 0.5 ? randF(14, 16) : r < 0.85 ? randF(10, 14) : randF(5, 10);
      const skillVal = targetAvg / 4; // map /20 → /5

      const skills: Skills = {
        discipline: {
          discipline: round5(skillVal + randF(-0.5, 0.5)),
          motivation: round5(skillVal + randF(-0.5, 0.5)),
          communication: round5(skillVal + randF(-0.5, 0.5)),
          listening: round5(skillVal + randF(-0.5, 0.5)),
        },
        work: {
          initiative: round5(skillVal + randF(-0.5, 0.5)),
          analysis: round5(skillVal + randF(-0.5, 0.5)),
          organization: round5(skillVal + randF(-0.5, 0.5)),
          intellectual: round5(skillVal + randF(-0.5, 0.5)),
          pace: round5(skillVal + randF(-0.5, 0.5)),
          speed: round5(skillVal + randF(-0.5, 0.5)),
        },
      };
      useStore.getState().setSkills(c.id, skills);

      // Modules: fill scores for past promos, partial for current, none for future
      const fillCount = idx === 1 ? 5 : idx === 0 ? 3 : 0;
      for (let m = 1; m <= fillCount; m++) {
        const score = Math.min(20, Math.max(0, Math.round((targetAvg + randF(-2, 2)) * 100) / 100));
        useStore.getState().updateModuleScore(c.id, m, score);
      }

      if (i === 2 && idx === 1) useStore.getState().changeStatus(c.id, "Terminated");
      else if (i === 5 && idx === 1) useStore.getState().changeStatus(c.id, "Dismissed");
      else if (i === 1 && idx === 0) useStore.getState().changeStatus(c.id, "Dismissed");
      else if (idx === 1 && targetAvg >= 10) useStore.getState().changeStatus(c.id, "Graduated");
    }
  });

  useStore.setState({ seeded: true });
};
