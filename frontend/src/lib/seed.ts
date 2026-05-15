import { addDays, format, subDays, differenceInYears } from "date-fns";
import { useStore } from "./store";
import type { EducationLevel, Skills } from "./types";

const firstNames = ["Yasmine", "Karim", "Sofia", "Mehdi", "Lina", "Omar", "Aya"];
const lastNames = ["El Amrani", "Benali", "Tazi", "Bennani", "Cherkaoui", "Idrissi"];
const educations: EducationLevel[] = ["Bac+2", "Bac+3", "Bac+5", "Bac+8"];
const diplomas = ["Marketing Digital", "Génie Logiciel", "Commerce", "Informatique"];

const rand = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const randF = (min: number, max: number, dec = 1) =>
  Math.round((Math.random() * (max - min) + min) * 10 ** dec) / 10 ** dec;

export const seedSampleData = () => {
  const s = useStore.getState();
  
  // Force wipe the massive dataset so we can revert to the simple one
  if (s.promotions.length > 4) {
    s.resetSeed();
  } else if (s.promotions.length > 0) {
    return; // Already seeded with simple data
  }

  const today = new Date();
  
  // Create 3 simple promotions
  const p1 = s.addPromotion({ name: "Web Dev Bootcamp 2024", startDate: format(subDays(today, 60), "yyyy-MM-dd") });
  const p2 = s.addPromotion({ name: "Data Analysis Q3", startDate: format(subDays(today, 15), "yyyy-MM-dd") });
  const p3 = s.addPromotion({ name: "UI/UX Masterclass", startDate: format(addDays(today, 30), "yyyy-MM-dd") });

  const promos = [
    { id: p1.id, start: p1.startDate, count: 8 },
    { id: p2.id, start: p2.startDate, count: 6 },
    { id: p3.id, start: p3.startDate, count: 5 },
  ];

  const genders = ["Homme", "Femme"] as const;

  promos.forEach((promo, idx) => {
    for (let i = 0; i < promo.count; i++) {
      const fn = rand(firstNames);
      const ln = rand(lastNames);
      const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@cmh.ma`;
      const gender = rand(genders);
      const age = Math.floor(Math.random() * 15) + 20; // 20 to 34

      const res = s.addCandidate({
        promotionId: promo.id,
        firstName: fn,
        lastName: ln,
        email,
        phone: `+212 6${Math.floor(10000000 + Math.random() * 89999999)}`,
        recruitmentDate: format(subDays(new Date(promo.start), Math.floor(Math.random() * 20)), "yyyy-MM-dd"),
        educationLevel: rand(educations),
        gender,
        age,
        diplomaName: rand(diplomas),
        diplomaAverage: randF(10, 18),
      });

      if (!res.ok) continue;
      
      const candidates = useStore.getState().candidates;
      const c = candidates[candidates.length - 1];

      // Random skills (out of 5 scale, matching new math)
      const skills: Skills = {
        discipline: {
          discipline: randF(2.5, 5),
          motivation: randF(2.5, 5),
          communication: randF(2.5, 5),
          listening: randF(2.5, 5),
        },
        work: {
          initiative: randF(2.5, 5),
          analysis: randF(2.5, 5),
          organization: randF(2.5, 5),
          intellectual: randF(2.5, 5),
          pace: randF(2.5, 5),
          speed: randF(2.5, 5),
        },
      };
      s.setSkills(c.id, skills);

      // Random modules (out of 20 scale, matching new math)
      const isFuture = new Date(promo.start) > today;
      if (!isFuture) {
        for (let m = 1; m <= 3; m++) {
          s.updateModuleScore(c.id, m, randF(8, 20));
        }
      }

      // Random status
      const r = Math.random();
      if (r < 0.1 && !isFuture) s.changeStatus(c.id, "Dismissed");
      else if (r < 0.2 && !isFuture) s.changeStatus(c.id, "Graduated");
    }
  });

  useStore.setState({ seeded: true });
};
