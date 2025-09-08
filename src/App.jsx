import React, { useState } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import weekday from "dayjs/plugin/weekday";
import isoWeek from "dayjs/plugin/isoWeek";
import "./App.css";

dayjs.extend(isBetween);
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

  const handleBulkAdd = (input, setList) => {
    const names = input
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter(Boolean);
    setList(names);
  };

  const handleDateChange = (list, setList, name, field, value) => {
    const updated = list.map((item) =>
      item.name === name ? { ...item, [field]: value } : item
    );
    setList(updated);
  };

  const initializeNameListWithDates = (names) =>
    names.map((name) => ({
      name,
      from: "",
      to: ""
    }));

  const getWeekdaysInMonth = (month) => {
    const start = dayjs(month).startOf("month");
    const end = dayjs(month).endOf("month");
    let days = [];

    for (let day = start; day.isBefore(end); day = day.add(1, "day")) {
      const dow = day.day();
      if (dow >= 1 && dow <= 5) {
        days.push(day);
      }
    }

    return days;
  };

  const isAvailable = (name, date) => {
  const inOffice = office.find((o) => o.name === name);
  const onVacation = vacation.find((v) => v.name === name);

  if (
    inOffice &&
    inOffice.from &&
    inOffice.to &&
    dayjs(date).isBetween(inOffice.from, inOffice.to, null, "[]")
  ) {
    return false;
  }

  if (
    onVacation &&
    onVacation.from &&
    onVacation.to &&
    dayjs(date).isBetween(onVacation.from, onVacation.to, null, "[]")
  ) {
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

    directors.forEach((d) => (counts[d] = 0));

    let weekBuffer = {};

    days.forEach((day, index) => {
      const week = day.isoWeek();
      const weekdayIndex = day.day(); // 1-5

      if (!weekBuffer[week]) {
        weekBuffer[week] = [];
      }

      const usedToday = new Set();

      const eligible = directors.filter((name) => {
        if (!isAvailable(name, day)) return false;

        const workedLastWeek = lastWeekDuties[name] || [];
        if (workedLastWeek.includes(weekdayIndex)) return false;

        const prevDay = index > 0 ? days[index - 1] : null;
        if (prevDay) {
          const prevAssigned = plan.find(
            (p) => p.date === prevDay.format("YYYY-MM-DD")
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

      for (let name of sorted) {
        if (selected.length < 4 && !usedToday.has(name)) {
          selected.push(name);
          usedToday.add(name);
          counts[name]++;
          if (!lastWeekDuties[name]) lastWeekDuties[name] = [];
          lastWeekDuties[name].push(weekdayIndex);
        }
      }

      plan.push({
        date: day.format("YYYY-MM-DD"),
        day: weekDayNames[weekdayIndex - 1],
        people: selected
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
        rows="3"
        placeholder="Ali, Ayşe, Mehmet..."
        value={directorsInput}
        onChange={(e) => setDirectorsInput(e.target.value)}
      />
      <br />
      <button
        onClick={() => handleBulkAdd(directorsInput, setDirectors)}
      >
        Yönetmenleri Ekle
      </button>
      <ul>
        {directors.map((d, i) => (
          <li key={i}>{d}</li>
        ))}
      </ul>

      <h3>🏢 Ofistekileri Ekle</h3>
      <textarea
        rows="2"
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
            value={person.from}
            onChange={(e) =>
              handleDateChange(office, setOffice, person.name, "from", e.target.value)
            }
          />
          <label>Bitiş:</label>
          <input
            type="date"
            value={person.to}
            onChange={(e) =>
              handleDateChange(office, setOffice, person.name, "to", e.target.value)
            }
          />
        </div>
      ))}

      <h3>🏖️ İzindekileri Ekle</h3>
      <textarea
        rows="2"
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
            value={person.from}
            onChange={(e) =>
              handleDateChange(vacation, setVacation, person.name, "from", e.target.value)
            }
          />
          <label>Bitiş:</label>
          <input
            type="date"
            value={person.to}
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
