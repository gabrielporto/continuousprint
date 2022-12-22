/*
 * View model for OctoPrint-Print-Queue
 *
 * Contributors: Michael New, Scott Martin
 * License: AGPLv3
 */

if (typeof ko === "undefined" || ko === null) {
  ko = require('knockout');
}

// Sets are a sequence of the same queue item repated a number of times.
// This is an abstraction on top of the actual queue maintained by the server.
function CPSet(data, job, api, profile) {
  var self = this;
  self.id = (data.id !== undefined) ? data.id : -1;

  self.sd = ko.observable(data.sd);
  self.path = ko.observable(data.path);
  self.shortName = ko.computed(() => {
    return self.path().split(/[\\/]/).pop();
  });
  self.count = ko.observable(data.count);
  self.missing_file = ko.observable(data.missing_file);
  self.remaining = ko.observable((data.remaining !== undefined) ? data.remaining : data.count);
  self.completed = ko.observable((data.completed !== undefined) ? data.completed : 0);
  self.expanded = ko.observable(data.expanded);
  self.mats = ko.observable(data.materials || []);
  self.profiles = ko.observableArray(data.profiles || []);
  self.metadata = (data.metadata) ? JSON.parse(data.metadata) : null;
  self.profile_matches = ko.computed(function() {
    let profs = self.profiles();
    if (profs.length === 0) {
      return true;
    }
    return (profs.indexOf(profile()) !== -1);
  }); // TODO

  self.addProfile = function(_, e) {
    let v = e.target.value;
    if (self.profiles.indexOf(v) === -1) {
      self.profiles.push(v);
    }
    e.target.value = ''; // Reset to empty since user has chosen
  };
  self.rmProfile = function(v, e) {
    self.profiles.remove(v);
  };

  self.as_object = function() {
    return {
      id: self.id,
      sd: self.sd(),
      path: self.path(),
      count: self.count(),
      remaining: self.remaining(),
      materials: self.mats(),
      profiles: self.profiles(),
      metadata: data.metadata,
    };
  }
  self.length_remaining = ko.computed(function() {
    let c = parseInt(self.count(), 10);
    let r = parseInt(self.remaining(), 10);
    let jr = parseInt(job.remaining(), 10);
    if (isNaN(c) || isNaN(r) || isNaN(jr)) {
      return ' ';
    }
    return Math.max(0, (jr-1) * c + r);
  });
  self.onCountFocus = function() {
    self._tmp_count = self.count();
  };
  self.onCountBlur = function() {
    if (self.count() !== self._tmp_count) {
      self.remaining(self.count());
    };
  };
  self.remove = function() {
    // Just remove from UI - actual removal happens when saving the job
    job.sets.remove(self);
  }
  self._textColorFromBackground = function(rrggbb) {
    // https://stackoverflow.com/a/12043228
    var rgb = parseInt(rrggbb.substr(1), 16);   // convert rrggbb to decimal
    var r = (rgb >> 16) & 0xff;  // extract red
    var g = (rgb >>  8) & 0xff;  // extract green
    var b = (rgb >>  0) & 0xff;  // extract blue
    var luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709
    return (luma >= 128) ? "#000000" : "#FFFFFF";
  }
  self._materialShortName = function(m) {
    m = m.trim().toUpperCase();
    if (m === "PETG") {
      return "G";
    }
    return m[0];
  }
  self.materials = ko.computed(function() {
    let result = [];
    for (let i of self.mats()) {
      if (i === null || i === "") {
        result.push({
          title: "any",
          shortName: " ",
          color: "transparent",
          bgColor: "transparent",
          key: i,
        });
        continue;
      }
      let split = i.split("_");
      let bg = split[2] || "";
      let title = split[0] + ' (' + split[1] + ')';
      result.push({
        title: title,
        shortName: self._materialShortName(split[0]),
        color: self._textColorFromBackground(bg),
        bgColor: bg,
        key: i,
      });
    }
    return result;
  });
  self.pct_complete = ko.computed(function() {
    let cplt = self.completed();
    let total = cplt + self.remaining();
    return Math.max(0, Math.round(100 * cplt/total)) + '%';
  });
  self.pct_active = ko.computed(function() {
    return Math.max(0, Math.round(100 / (self.completed() + self.remaining()))) + '%';
  });
  self.progress_text = ko.computed(function() {
    let cplt = self.completed();
    let total = cplt + self.remaining();
    return `${cplt}/${total}`;
  });

  // ==== Mutation methods ====
  self.set_material = function(t, v) {
    if (v === "Any") {
      v = '';
    }
    let mats = self.mats();
    while (t >= mats.length) {
      mats.push('');
    }
    mats[t] = v;
    // Discard empties
    while (mats.length > 0 && mats[mats.length-1] == '') {
      mats.pop();
    }
    self.mats(mats);
  }
}

try {
  module.exports = CPSet;
} catch {}
