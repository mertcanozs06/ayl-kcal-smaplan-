const dayNames = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];

const createPlanForMonth = (
  month,
  year,
  yonetmenler,
  ofistekiler,
  izindekiler,
  ofisDates,
  izinDates,
  holidays,
  previousFriday = null,
  prevShiftCounts = null
) => {
  const plan = [];
  const shiftCounts = yonetmenler.reduce((acc, p) => ({ ...acc, [p]: 0 }), {});
  const daysInMonth = new Date(year, month, 0).getDate();

  // İş günlerini toplama (Pzt-Cum)
  const workdays = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month - 1, d);
    const day = dt.getDay();
    const ds = dt.toISOString().split("T")[0];
    if (day >= 1 && day <= 5 && !holidays.includes(ds)) {
      workdays.push(ds);
    }
  }

  // Haftaları Pazartesi’ye göre ayırma
  const weeks = [];
  let currentWeekDays = [];
  workdays.forEach((dateStr) => {
    const dt = new Date(dateStr);
    const day = dt.getDay();
    if (day === 1 && currentWeekDays.length) {
      weeks.push(currentWeekDays);
      currentWeekDays = [];
    }
    currentWeekDays.push(dateStr);
  });
  if (currentWeekDays.length) weeks.push(currentWeekDays);

  // Nöbet hedef sayısı hesaplama
  const totalShiftsNeeded = workdays.length * 4; // Her iş günü 4 kişi
  const totalPeople = yonetmenler.length;
  const base = Math.floor(totalShiftsNeeded / totalPeople);
  const extra = totalShiftsNeeded % totalPeople;

  const totalShifts = yonetmenler.reduce((acc, p, idx) => {
    acc[p] = base + (idx < extra ? 1 : 0);
    return acc;
  }, {});

  // Önceki ay nöbet sayısı varsa kullan
  if (prevShiftCounts) {
    Object.keys(prevShiftCounts).forEach((p) => {
      if (totalShifts[p] < prevShiftCounts[p]) {
        totalShifts[p] = prevShiftCounts[p];
      }
    });
  }

  let previousWeekFriday = previousFriday;

  weeks.forEach((weekDays, wIdx) => {
    const weekAssigned = {};
    yonetmenler.forEach((p) => (weekAssigned[p] = false));
    const weekPlan = Array(5)
      .fill()
      .map(() => ({ date: null, people: [] }));

    weekDays.forEach((dateStr) => {
      const dt = new Date(dateStr);
      const dayIndex = dt.getDay() - 1; // 0 = Pazartesi

      // Uygun kişiler
      const available = yonetmenler.filter((p) => {
        if (weekAssigned[p]) return false;
        if (ofistekiler.includes(p) && ofisDates[p]?.includes(dateStr))
          return false;
        if (izindekiler.includes(p) && izinDates[p]?.includes(dateStr))
          return false;
        if (dt.getDay() === 5 && previousWeekFriday?.includes(p)) return false;
        return shiftCounts[p] < totalShifts[p];
      });

      if (available.length < 4) {
        throw new Error(`Gün ${dateStr}: Yeterli kişi bulunamadı`);
      }

      // En az nöbet tutanı bul
      available.sort((a, b) => shiftCounts[a] - shiftCounts[b]);
      const candidates = available.slice(0, Math.min(available.length, 6));
      candidates.sort(() => Math.random() - 0.5);
      const selected = candidates.slice(0, 4);

      selected.forEach((p) => {
        shiftCounts[p]++;
        weekAssigned[p] = true;
      });
      weekPlan[dayIndex] = { date: dateStr, people: selected };

      if (dt.getDay() === 5) {
        previousWeekFriday = selected;
      }
    });

    plan.push(weekPlan);
  });

  return { plan, shiftCounts, lastFriday: previousWeekFriday };
};

self.onmessage = (e) => {
  const {
    month,
    year,
    yonetmenler,
    ofistekiler,
    izindekiler,
    ofisDates,
    izinDates,
    holidays,
    nextMonth,
    nextYear,
  } = e.data;
  try {
    const current = createPlanForMonth(
      month,
      year,
      yonetmenler,
      ofistekiler,
      izindekiler,
      ofisDates,
      izinDates,
      holidays
    );
    const next = createPlanForMonth(
      nextMonth,
      nextYear,
      yonetmenler,
      ofistekiler,
      izindekiler,
      ofisDates,
      izinDates,
      holidays,
      current.lastFriday,
      current.shiftCounts
    );
    self.postMessage({ currentResult: current, nextResult: next });
  } catch (err) {
    self.postMessage({ error: err.message });
  }
};
