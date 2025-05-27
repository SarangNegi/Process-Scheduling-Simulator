window.onload = function () {

  let fcfsTAT = 0, fcfsWT = 0;
  let sjfTAT = 0, sjfWT = 0;
  let priorityTAT = 0, priorityWT = 0;
  let rrTAT = 0, rrWT = 0;

  let processes = [];


  document.getElementById("processForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const pid = document.getElementById("pid").value.trim();
    const arrival = parseInt(document.getElementById("arrival").value);
    const burst = parseInt(document.getElementById("burst").value);
    const priority = parseInt(document.getElementById("priority").value);

    if (!pid || isNaN(arrival) || isNaN(burst)) return;

    processes.push({ pid, arrival, burst, priority });
    updateProcessTable();
    this.reset();
  });

  function updateProcessTable() {
    const tbody = document.querySelector("#processTable tbody");
    tbody.innerHTML = "";
    processes.forEach(p => {
      tbody.innerHTML += `<tr><td>${p.pid}</td><td>${p.arrival}</td><td>${p.burst}</td><td>${p.priority}</td></tr>`;
    });
  }

  function clearOutput() {
    document.getElementById("ganttChart").innerHTML = "";
    document.getElementById("results").innerHTML = "";
  }

  document.getElementById("runFCFS").addEventListener("click", () => {
    clearOutput();
    if (processes.length === 0) return;

    const sorted = [...processes].sort((a, b) => a.arrival - b.arrival);
    let time = 0;
    const gantt = [];
    const results = [];

    sorted.forEach(p => {
      if (time < p.arrival) time = p.arrival;
      const start = time;
      const end = time + p.burst;
      const tat = end - p.arrival;
      const wt = tat - p.burst;

      gantt.push({ pid: p.pid, start, end });
      results.push({ pid: p.pid, ct: end, tat, wt });

      time = end;
    });

    renderGantt(gantt);
    renderResults(results);

    fcfsTAT = results.reduce((a, r) => a + r.tat, 0) / results.length;
    fcfsWT = results.reduce((a, r) => a + r.wt, 0) / results.length;
  });

  document.getElementById("runSJF").addEventListener("click", () => {
    clearOutput();
    if (processes.length === 0) return;

    let time = 0, completed = 0;
    const n = processes.length;
    const visited = new Array(n).fill(false);
    const proc = [...processes];
    const gantt = [];
    const results = [];

    while (completed < n) {
      let idx = -1, minBurst = Infinity;
      for (let i = 0; i < n; i++) {
        if (!visited[i] && proc[i].arrival <= time && proc[i].burst < minBurst) {
          minBurst = proc[i].burst;
          idx = i;
        }
      }
      if (idx === -1) {
        time++;
        continue;
      }
      const start = time;
      const end = time + proc[idx].burst;
      const tat = end - proc[idx].arrival;
      const wt = tat - proc[idx].burst;

      gantt.push({ pid: proc[idx].pid, start, end });
      results.push({ pid: proc[idx].pid, ct: end, tat, wt });

      visited[idx] = true;
      completed++;
      time = end;
    }

    renderGantt(gantt);
    renderResults(results);

    sjfTAT = results.reduce((a, r) => a + r.tat, 0) / results.length;
    sjfWT = results.reduce((a, r) => a + r.wt, 0) / results.length;
  });

  document.getElementById("runPriority").addEventListener("click", () => {
    clearOutput();
    if (processes.length === 0) return;

    const proc = processes.map(p => ({ ...p }));
    const n = proc.length;
    let time = 0, completed = 0;
    const isCompleted = new Array(n).fill(false);
    const gantt = [];
    const results = [];

    while (completed < n) {
      let idx = -1, minPriority = Infinity;
      for (let i = 0; i < n; i++) {
        if (!isCompleted[i] && proc[i].arrival <= time) {
          if (proc[i].priority < minPriority) {
            minPriority = proc[i].priority;
            idx = i;
          }
        }
      }
      if (idx === -1) {
        time++;
        continue;
      }
      const start = time;
      const end = time + proc[idx].burst;
      const tat = end - proc[idx].arrival;
      const wt = tat - proc[idx].burst;

      gantt.push({ pid: proc[idx].pid, start, end });
      results.push({ pid: proc[idx].pid, ct: end, tat, wt });

      isCompleted[idx] = true;
      completed++;
      time = end;
    }

    renderGantt(gantt);
    renderResults(results);

    priorityTAT = results.reduce((a, r) => a + r.tat, 0) / results.length;
    priorityWT = results.reduce((a, r) => a + r.wt, 0) / results.length;
  });

  document.getElementById("runRR").addEventListener("click", () => {
    clearOutput();
    if (processes.length === 0) return;

    const quantum = parseInt(document.getElementById("timeQuantum").value);
    if (isNaN(quantum) || quantum <= 0) {
      alert("Please enter a valid time quantum.");
      return;
    }

    const n = processes.length;
    const proc = processes.map(p => ({ ...p }));
    const remaining = proc.map(p => p.burst);
    const gantt = [];
    const results = [];
    const visited = new Array(n).fill(false);

    let time = 0;
    let completed = 0;
    let queue = [];

    while (completed < n) {
      for (let i = 0; i < n; i++) {
        if (proc[i].arrival <= time && !visited[i]) {
          queue.push(i);
          visited[i] = true;
        }
      }

      if (queue.length === 0) {
        time++;
        continue;
      }

      let idx = queue.shift();
      const execTime = Math.min(quantum, remaining[idx]);
      const start = time;
      const end = time + execTime;

      gantt.push({ pid: proc[idx].pid, start, end });

      time = end;
      remaining[idx] -= execTime;

      for (let i = 0; i < n; i++) {
        if (proc[i].arrival > start && proc[i].arrival <= time && !visited[i]) {
          queue.push(i);
          visited[i] = true;
        }
      }

      if (remaining[idx] > 0) {
        queue.push(idx);
      } else {
        const ct = time;
        const tat = ct - proc[idx].arrival;
        const wt = tat - proc[idx].burst;
        results.push({ pid: proc[idx].pid, ct, tat, wt });
        completed++;
      }
    }

    renderGantt(gantt);
    renderResults(results);

    rrTAT = results.reduce((a, r) => a + r.tat, 0) / results.length;
    rrWT = results.reduce((a, r) => a + r.wt, 0) / results.length;
  });

  function renderGantt(gantt) {
    const container = document.getElementById("ganttChart");
    container.innerHTML = "";
    const colors = ["#3498db", "#e67e22", "#9b59b6", "#1abc9c", "#f39c12", "#2ecc71"];
    gantt.forEach((g, i) => {
      const div = document.createElement("div");
      div.className = "gantt-block";
      div.style.backgroundColor = colors[i % colors.length];
      div.textContent = `${g.pid} (${g.start}-${g.end})`;
      container.appendChild(div);
    });
  }

  function renderResults(data) {
    const div = document.getElementById("results");
    let html = `<table>
      <thead><tr><th>PID</th><th>Completion Time</th><th>Turnaround Time</th><th>Waiting Time</th></tr></thead><tbody>`;
    data.forEach(d => {
      html += `<tr><td>${d.pid}</td><td>${d.ct}</td><td>${d.tat}</td><td>${d.wt}</td></tr>`;
    });
    html += "</tbody></table>";
    div.innerHTML = html;
  }

  document.getElementById("compareAverages").addEventListener("click", () => {
    const compareDiv = document.getElementById("chartsArea");
    compareDiv.innerHTML = "";

    const tatData = {
      labels: ["FCFS", "SJF", "Priority", "Round Robin"],
      values: [fcfsTAT, sjfTAT, priorityTAT, rrTAT]
    };

    const wtData = {
      labels: ["FCFS", "SJF", "Priority", "Round Robin"],
      values: [fcfsWT, sjfWT, priorityWT, rrWT]
    };

    const tatCanvas = document.createElement("canvas");
    tatCanvas.id = "tatChart";
    compareDiv.appendChild(document.createElement("h3")).innerText = "Average Turnaround Time Comparison";
    compareDiv.appendChild(tatCanvas);

    const wtCanvas = document.createElement("canvas");
    wtCanvas.id = "wtChart";
    compareDiv.appendChild(document.createElement("h3")).innerText = "Average Waiting Time Comparison";
    compareDiv.appendChild(wtCanvas);

    drawBarChart(tatCanvas, tatData, "Average Turnaround Time");
    drawBarChart(wtCanvas, wtData, "Average Waiting Time");
  });

  function drawBarChart(canvas, data, label) {
    new Chart(canvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: data.labels,
        datasets: [{
          label: label,
          data: data.values,
          backgroundColor: ["#3498db", "#e67e22", "#9b59b6", "#1abc9c"]
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }
};