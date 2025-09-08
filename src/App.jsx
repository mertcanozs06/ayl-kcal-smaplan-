import React, { useState } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import customParseFormat from "dayjs/plugin/customParseFormat";
import weekday from "dayjs/plugin/weekday";
import isoWeek from "dayjs/plugin/isoWeek";
import "./App.css";

dayjs.extend(isBetween);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(customParseFormat);
dayjs.extend(weekday);
dayjs.extend(isoWeek);

const App = () => {
  const [month, setMonth] = useState("2025-09");
  const [directorsInput, setDirectorsInput] = useState("");
  const [directors, setDirectors] = useState([]);
  const [officeNamesInput, setOfficeNamesInput] = useState("");
  const [office, setOffice] = useState([]);
  const [vacationNamesInput, setVacationNamesInput] = useState("");
  const [vacation, setVacation] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [dutyCount, setDutyCount] = useState({});

  const DATE_FORMAT = "YYYY-MM-DD";

  const handleBulkAdd = (input, setList) => {
    const names = input
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter(Boolean);
    setList(names);
  };

  const handleDateChange = (list, setList, name, field, value) => {
    const updated = list.map((item) =>
      item.name === name ? { ...item, [field]: value || null } : item
    );
    setList(updated);
  };

  const initializeNameListWithDates = (names) =>
    names
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({
        name,
        from: null,
        to: null,
      }));

  const getWeekdaysInMonth = (month) => {
    const start = dayjs(month).startOf("month");
    const end = dayjs(month).endOf("month");
    let days = [];

    for (let day = start; day.isBefore(end) || day.isSame(end); day = day.add(1, "day")) {
      const dow = day.day();
      if (dow >= 1 && dow <= 5) {
        days.push(day);
      }
    }

    return days;
  };

  const isDateInRange = (date, from, to) => {
    if (!from || !to) return false;

    const d = dayjs(date, DATE_FORMAT, true);
    const start = dayjs(from, DATE_FORMAT, true);
    const end = dayjs(to, DATE_FORMAT, true);

    if (!d.isValid() || !start.isValid() || !end.isValid()) return false;

    return (d.isSame(start) || d.isAfter(start)) && (d.isSame(end) || d.isBefore(end));
  };

  const isAvailable = (name, date) => {
    const inOffice = office.find((o) => o.name === name);
    const onVacation = vacation.find((v) => v.name === name);

    if (inOffice && isDateInRange(date, inOffice.from, inOffice.to)) {
      return false;
    }

    if (onVacation && isDateInRange(date, onVacation.from, onVacation.to)) {
      return false;
    }

    return true;
  };

  const createMonthlyPlan = () => {
    const days = getWeekdaysInMonth(month);
    const plan = [];
    const counts = {};
    const lastWeekDuties = {};
    const weekDayNames = ["Pzt", "Sal", "Çar", "Per", "Cum"];

    // Combine directors, office, and vacation names, ensuring uniqueness
    const allPeople = [
      ...new Set([
        ...directors,
        ...office.map((o) => o.name),
        ...vacation.map((v) => v.name),
      ]),
    ];

    allPeople.forEach((name) => (counts[name] = 0));

    days.forEach((day, index) => {
      const week = day.isoWeek();
      const weekdayIndex = day.day(); // 1-5 (Mon-Fri)

      const usedToday = new Set();

      const eligible = allPeople.filter((name) => {
        if (!isAvailable(name, day.format(DATE_FORMAT))) return false;

        const workedLastWeek = lastWeekDuties[name] || [];
        if (workedLastWeek.includes(weekdayIndex)) return false;

        const prevDay = index > 0 ? days[index - 1] : null;
        if (prevDay) {
          const prevAssigned = plan.find(
            (p) => p.date === prevDay.format(DATE_FORMAT)
          );
          if (prevAssigned && prevAssigned.people.includes(name)) {
            const prevDayIndex = prevDay.day();
            if (
              (prevDayIndex === 5 && weekdayIndex === 1) ||
              (prevDayIndex === 1 && weekdayIndex === 2)
            ) {
              return false;
            }
          }
        }

        return true;
      });

      const sorted = eligible.sort((a, b) => counts[a] - counts[b]);
      const selected = [];

      let added = 0;
      for (let i = 0; i < sorted.length && added < 4; i++) {
        const name = sorted[i];
        if (!usedToday.has(name)) {
          selected.push(name);
          usedToday.add(name);
          counts[name]++;
          if (!lastWeekDuties[name]) lastWeekDuties[name] = [];
          lastWeekDuties[name].push(weekdayIndex);
          added++;
        }
      }

      // Fallback if fewer than 4 people are selected
      if (selected.length < 4) {
        const fallback = allPeople
          .filter((name) => !usedToday.has(name) && isAvailable(name, day.format(DATE_FORMAT)))
          .sort((a, b) => counts[a] - counts[b]);

        for (let i = 0; i < fallback.length && selected.length < 4; i++) {
          const name = fallback[i];
          selected.push(name);
          usedToday.add(name);
          counts[name]++;
          if (!lastWeekDuties[name]) lastWeekDuties[name] = [];
          lastWeekDuties[name].push(weekdayIndex);
        }
      }

      plan.push({
        date: day.format(DATE_FORMAT),
        day: weekDayNames[weekdayIndex - 1],
        people: selected,
      });
    });

    setSchedule(plan);
    setDutyCount(counts);
  };

  return (
    <div className="app">
      <h2>🎯 Aylık Nöbet Planı Oluşturucu</h2>

      <label>📅 Ay Seç (YYYY-MM): </label>
      <input
        type="month"
        value={month}
        onChange={(e) => setMonth(e.target.value)}
      />
      <hr />

      <h3>🎬 Yönetmenleri Toplu Ekle</h3>
      <textarea
        rows="5"
        placeholder="Ali, Ayşe, Mehmet..."
        value={directorsInput}
        onChange={(e) => setDirectorsInput(e.target.value)}
      />
      <br />
      <button onClick={() => handleBulkAdd(directorsInput, setDirectors)}>
        Yönetmenleri Ekle
      </button>
      <ul>
        {directors.map((d, i) => (
          <li key={i}>{d}</li>
        ))}
      </ul>

      <h3>🏢 Ofistekileri Ekle</h3>
      <textarea
        rows="3"
        placeholder="Ahmet, Veli..."
        value={officeNamesInput}
        onChange={(e) => setOfficeNamesInput(e.target.value)}
      />
      <br />
      <button
        onClick={() =>
          setOffice(initializeNameListWithDates(officeNamesInput.split(/[\n,]+/)))
        }
      >
        Ofistekileri Ekle
      </button>
      {office.map((person, i) => (
        <div key={i}>
          <strong>{person.name}</strong>
          <br />
          <label>Başlangıç:</label>
          <input
            type="date"
            value={person.from || ""}
            onChange={(e) =>
              handleDateChange(office, setOffice, person.name, "from", e.target.value)
            }
          />
          <label>Bitiş:</label>
          <input
            type="date"
            value={person.to || ""}
            onChange={(e) =>
              handleDateChange(office, setOffice, person.name, "to", e.target.value)
            }
          />
        </div>
      ))}

      <h3>🏖️ İzindekileri Ekle</h3>
      <textarea
        rows="3"
        placeholder="Fatma, Emre..."
        value={vacationNamesInput}
        onChange={(e) => setVacationNamesInput(e.target.value)}
      />
      <br />
      <button
        onClick={() =>
          setVacation(initializeNameListWithDates(vacationNamesInput.split(/[\n,]+/)))
        }
      >
        İzindekileri Ekle
      </button>
      {vacation.map((person, i) => (
        <div key={i}>
          <strong>{person.name}</strong>
          <br />
          <label>Başlangıç:</label>
          <input
            type="date"
            value={person.from || ""}
            onChange={(e) =>
              handleDateChange(vacation, setVacation, person.name, "from", e.target.value)
            }
          />
          <label>Bitiş:</label>
          <input
            type="date"
            value={person.to || ""}
            onChange={(e) =>
              handleDateChange(vacation, setVacation, person.name, "to", e.target.value)
            }
          />
        </div>
      ))}

      <hr />

      <button onClick={createMonthlyPlan}>📌 Aylık Plan Oluştur</button>

      {schedule.length > 0 && (
        <>
          <h3>📆 Aylık Plan</h3>
          <table border="1" cellPadding="5">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Gün</th>
                <th>Nöbetçiler</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((s, idx) => (
                <tr key={idx}>
                  <td>{s.date}</td>
                  <td>{s.day}</td>
                  <td>{s.people.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>👥 Nöbet Sayıları</h3>
          <table border="1" cellPadding="5">
            <thead>
              <tr>
                <th>Yönetmen</th>
                <th>Nöbet Sayısı</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(dutyCount).map(([name, count]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export default App;
