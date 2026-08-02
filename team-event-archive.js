(function exposeTeamEventArchive(root, factory) {
  const archive = factory(root.DoveTeamCalculator);
  if (typeof module === 'object' && module.exports) module.exports = archive;
  root.DoveTeamEventArchive = archive;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createTeamEventArchive(calculator) {
  function clone(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }

  function cleanName(value) {
    return String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ');
  }

  function scoreKeyForName(name) {
    return cleanName(name).toLocaleLowerCase('en-CA').replace(/[.#$/[\]]/g, '_');
  }

  function uniqueAttendees(registrations) {
    const source = Array.isArray(registrations) ? registrations : Object.values(registrations || {});
    const seen = new Set();
    return source.flatMap((registration) => {
      const name = cleanName(registration && registration.name);
      const key = scoreKeyForName(name);
      if (!key || seen.has(key)) return [];
      seen.add(key);
      return [{
        id: registration.id || null,
        name,
        team: registration.team || null,
        gender: registration.gender || null,
        signupMode: registration.signupMode || 'single',
        groupId: registration.groupId || '',
        pairName: registration.pairName || '',
        joinedAt: Number(registration.joinedAt) || null
      }];
    });
  }

  function eventSnapshot(event, eventId, attendees, archivedAt) {
    const rounds = clone(Array.isArray(event.rounds) ? event.rounds : []);
    return {
      schemaVersion: 1,
      id: eventId,
      title: event.title || eventId,
      venue: event.venue || '',
      date: event.date || '',
      archivedAt,
      attendeeCount: attendees.length,
      attendeeNames: attendees.map(person => person.name),
      registrations: clone(attendees),
      teams: clone(event.teams || {}),
      rounds,
      finalResult: calculator && typeof calculator.calculate === 'function'
        ? calculator.calculate(rounds)
        : null,
      source: 'team-event-archive'
    };
  }

  function updateAttendance(scores, eventId, snapshot, recordedAt) {
    const attendanceEvents = scores.attendanceEvents && typeof scores.attendanceEvents === 'object'
      ? scores.attendanceEvents
      : {};
    if (attendanceEvents[eventId]) {
      return { changed: false, scores, count: Number(attendanceEvents[eventId].count) || 0 };
    }

    const players = scores.players && typeof scores.players === 'object' ? scores.players : {};
    snapshot.registrations.forEach((person) => {
      const key = scoreKeyForName(person.name);
      if (!key) return;
      const player = players[key] || { key, name: person.name, appearances: 0 };
      player.key = key;
      player.name = person.name;
      player.appearances = (Number(player.appearances) || 0) + 1;
      delete player.manualWins;
      delete player.courtWins;
      delete player.wins;
      delete player.points;
      player.lastPlayedAt = recordedAt;
      player.lastAttendanceEvent = eventId;
      player.updatedAt = recordedAt;
      players[key] = player;
    });

    const receipt = {
      eventId,
      title: snapshot.title,
      date: snapshot.date,
      venue: snapshot.venue,
      names: snapshot.attendeeNames,
      count: snapshot.attendeeCount,
      recordedAt,
      source: 'team-event-archive'
    };
    attendanceEvents[eventId] = receipt;
    const events = Array.isArray(scores.events) ? scores.events : [];
    events.unshift({
      type: 'specialEventAttendance',
      eventId,
      title: snapshot.title,
      names: snapshot.attendeeNames,
      count: snapshot.attendeeCount,
      ts: recordedAt
    });
    return {
      changed: true,
      count: snapshot.attendeeCount,
      scores: {
        ...scores,
        players,
        attendanceEvents,
        events: events.slice(0, 20),
        mode: 'attendance-only',
        updatedAt: recordedAt
      }
    };
  }

  function buildArchive(input, eventId, archivedAt = Date.now()) {
    const system = clone(input);
    const teamEvents = system.teamEvents && typeof system.teamEvents === 'object' ? system.teamEvents : {};
    const event = teamEvents[eventId];
    if (!event || typeof event !== 'object') {
      return { changed: false, data: system, summary: { reason: 'event-not-found', eventId } };
    }

    const eventArchives = system.eventArchives && typeof system.eventArchives === 'object'
      ? system.eventArchives
      : {};
    let snapshot = eventArchives[eventId];
    let changed = false;
    if (!snapshot) {
      snapshot = eventSnapshot(event, eventId, uniqueAttendees(event.registrations), archivedAt);
      eventArchives[eventId] = snapshot;
      changed = true;
    }

    const attendance = updateAttendance(
      system.scores && typeof system.scores === 'object' ? system.scores : {},
      eventId,
      snapshot,
      snapshot.archivedAt || archivedAt
    );
    if (attendance.changed) {
      system.scores = attendance.scores;
      changed = true;
    }

    const canonicalArchivedAt = Number(snapshot.archivedAt) || archivedAt;
    const needsEventLock = event.status !== 'archived'
      || Number(event.archivedAt) !== canonicalArchivedAt
      || event.archiveId !== eventId
      || Number(event.attendanceCount) !== snapshot.attendeeCount;
    if (needsEventLock) {
      teamEvents[eventId] = {
        ...event,
        status: 'archived',
        archivedAt: canonicalArchivedAt,
        archiveId: eventId,
        attendanceRecordedAt: canonicalArchivedAt,
        attendanceCount: snapshot.attendeeCount,
        attendanceNames: snapshot.attendeeNames,
        finalResult: snapshot.finalResult
      };
      changed = true;
    }

    system.teamEvents = teamEvents;
    system.eventArchives = eventArchives;
    return {
      changed,
      data: system,
      summary: {
        reason: changed ? 'archived' : 'already-archived',
        eventId,
        archivedAt: canonicalArchivedAt,
        attendanceRecorded: attendance.count,
        attendeeNames: snapshot.attendeeNames
      }
    };
  }

  return {
    buildArchive,
    cleanName,
    scoreKeyForName,
    uniqueAttendees
  };
}));
