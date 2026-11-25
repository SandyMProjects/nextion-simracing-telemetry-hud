// --- Helper functions ---
const NEXTION_END = "\xFF\xFF\xFF";

function setTxt(objectName, value) {
    return objectName + ".txt=\"" + value + "\"" + NEXTION_END;
}

function setVal(objectName, value) {
    return objectName + ".val=" + value + NEXTION_END;
}

function setVis(objectName, value) {
    return "vis " + objectName + "," + value + NEXTION_END;
}

function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
}

let result = "";

// Detect whether the game is running from the primary or fallback property.
const isGameRunning =
    $prop("DataCorePlugin.GameRunning") === 1 ||
    $prop("GameRunning") === 1;

if (!isGameRunning) {
    // Idle / home screen
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const timeHours = (hours < 10 ? "0" : "") + hours;
    const timeMinutes = (minutes < 10 ? "0" : "") + minutes;
    const separator = Date.now() % 1000 < 500 ? ":" : " ";

    const day = now.getDate();
    const year = now.getFullYear();
    const monthNames = [
        "Januari",
        "Februari",
        "Maret",
        "April",
        "Mei",
        "Juni",
        "Juli",
        "Agustus",
        "September",
        "Oktober",
        "November",
        "Desember"
    ];
    const month = monthNames[now.getMonth()];
    const fullDate = day + " " + month + " " + year;

    result += setTxt("JamTxt", timeHours + separator + timeMinutes);
    result += setTxt("TglTxt", fullDate);
} else {
    // High-priority data
    result += setVal("SpeedNum", Math.round($prop("SpeedKmh") || 0));
    result += setTxt("Gear", $prop("Gear") || "N");

    // ERS energy
    const ersJoules = $prop(
        "DataCorePlugin.GameRawData.PlayerCarStatusData.m_ersStoreEnergy"
    );

    let ersPercent;

    if (ersJoules !== null) {
        ersPercent = (ersJoules / 4000000) * 100;
    } else {
        const fallbackErs = $prop("ErsStore");
        ersPercent = fallbackErs !== null ? fallbackErs : 0;
    }

    ersPercent = clamp(ersPercent, 0, 100);

    const ersBarValue = Math.round(ersPercent);
    const ersTextValue =
        ersPercent === 100 ? "100" : ersPercent.toFixed(2);

    result += setVal("ERSbar", ersBarValue);
    result += setTxt("ERSPersent", ersTextValue + "%");

    // RPM and redline indicator
    const currentRpm = $prop("Rpms") || 0;
    const rpmStart = 10000;
    const rpmMax = 12100;

    let rpmPercent = 0;

    if (currentRpm > rpmStart) {
        rpmPercent = Math.round(
            ((currentRpm - rpmStart) / (rpmMax - rpmStart)) * 100
        );
    }

    rpmPercent = clamp(rpmPercent, 0, 100);

    const isRedline = currentRpm >= rpmMax;

    if (isRedline && Date.now() % 100 < 50) {
        rpmPercent = 0;
    }

    result += setVis("RPMbar", 1);
    result += setVal("RPMbar", rpmPercent);

    // DRS components
    const drsActive = $prop("DRSEnabled");

    if (drsActive) {
        result += setVis("DRSonL", 1) + setVis("DRSonR", 1);
        result += setVis("DRSoffL", 0) + setVis("DRSoffR", 0);
    } else {
        result += setVis("DRSonL", 0) + setVis("DRSonR", 0);
        result += setVis("DRSoffL", 1) + setVis("DRSoffR", 1);
    }

    // Low-priority data (approximately every 200 ms)
    if (Date.now() % 200 < 16) {
        // Lap and position
        result += setVal("LapNum", $prop("CurrentLap") || 0);
        result += setVal("Position", $prop("Position") || 0);

        // Tyre temperatures
        result += setVal(
            "TyreTempFL",
            Math.round($prop("TyreTemperatureFrontLeft") || 0)
        );
        result += setVal(
            "TyreTempFR",
            Math.round($prop("TyreTemperatureFrontRight") || 0)
        );
        result += setVal(
            "TyreTempRL",
            Math.round($prop("TyreTemperatureRearLeft") || 0)
        );
        result += setVal(
            "TyreTempRR",
            Math.round($prop("TyreTemperatureRearRight") || 0)
        );

        // Brake bias
        result += setTxt("BBNum", Math.round($prop("BrakeBias") || 50));

        // Differential
        const differential = $prop(
            "DataCorePlugin.GameRawData.PlayerCarSetup.m_onThrottle"
        );
        const differentialValue =
            differential !== null ? Math.round(differential) : 50;
        result += setTxt("DiffNum", differentialValue);

        // Lap time
        const lapRaw = $prop("CurrentLapTime");
        let lapText = lapRaw ? lapRaw.toString() : "00:00.000";

        if (lapText.length > 8) {
            lapText = lapText.substring(3, 11);
        }

        result += setTxt("LapTime", lapText);

        // Session delta
        const rawDelta =
            $prop("PersistantTrackerPlugin.SessionBestLiveDeltaSeconds") || 0;
        result += setTxt(
            "DeltaTime",
            (rawDelta > 0 ? "+" : "") + rawDelta.toFixed(2)
        );

        // Fuel
        result += setTxt("Fuel", ($prop("Fuel") || 0).toFixed(1));

        const fuelDelta =
            $prop("DataCorePlugin.GameRawData.SessionData.m_fuelDelta") || 0;
        result += setTxt(
            "FuelDelta",
            (fuelDelta > 0 ? "+" : "") + fuelDelta.toFixed(2)
        );

        // Tyre wear (displayed as a 0-100% remaining-wear indicator)
        const wearFL =
            100 - Math.round($prop("TyreWearFrontLeft") || 100);
        const wearFR =
            100 - Math.round($prop("TyreWearFrontRight") || 100);
        const wearRL =
            100 - Math.round($prop("TyreWearRearLeft") || 100);
        const wearRR =
            100 - Math.round($prop("TyreWearRearRight") || 100);

        result += setTxt("TyreWearFL", wearFL + "%");
        result += setTxt("TyreWearFR", wearFR + "%");
        result += setTxt("TyreWearRL", wearRL + "%");
        result += setTxt("TyreWearRR", wearRR + "%");

        // ERS deployment mode
        const ersMode =
            $prop(
                "DataCorePlugin.GameRawData.PlayerCarStatusData.m_ersDeployMode"
            ) || 0;

        const ersModeText =
            ersMode === 1
                ? "Medium"
                : ersMode === 2
                ? "Hotlap"
                : ersMode === 3
                ? "Overtake"
                : "None";

        result += setTxt("ERSMode", ersModeText);
    }
}

return result;
