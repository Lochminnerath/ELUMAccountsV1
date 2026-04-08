import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Save } from "lucide-react";
import { getUserSettings, saveUserSettings, type UserSettings } from "@/lib/settings";

export default function Settings() {
  const [settings, setSettings] = useState<UserSettings>({
    name: "",
    age: null,
    gender: "",
    calorieGoal: 1600,
  });
  const [saved, setSaved] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loaded = getUserSettings();
    setSettings(loaded);
  }, []);

  const handleSave = () => {
    saveUserSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="mt-2 text-muted-foreground">
              Configure your personal information and health goals
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-8">
            <div className="space-y-8">
              {/* Personal Information Section */}
              <div>
                <h2 className="mb-6 text-lg font-semibold text-foreground">
                  Personal Information
                </h2>

                <div className="space-y-6">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={settings.name}
                      onChange={(e) =>
                        setSettings({ ...settings, name: e.target.value })
                      }
                      placeholder="Enter your full name"
                      className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Age */}
                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      Age
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="150"
                      value={settings.age || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          age: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      placeholder="Enter your age"
                      className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      Gender
                    </label>
                    <select
                      value={settings.gender}
                      onChange={(e) =>
                        setSettings({ ...settings, gender: e.target.value })
                      }
                      className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Health Goals Section */}
              <div>
                <h2 className="mb-6 text-lg font-semibold text-foreground">
                  Health Goals
                </h2>

                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Daily Calorie Goal
                  </label>
                  <input
                    type="number"
                    min="1000"
                    max="5000"
                    value={settings.calorieGoal}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        calorieGoal: parseInt(e.target.value) || 1600,
                      })
                    }
                    className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Default recommendation is 1600 calories. Adjust based on your personal health goals.
                  </p>
                </div>
              </div>

              {/* Info Box */}
              <div className="rounded-lg border border-border/50 bg-secondary/30 p-4">
                <p className="text-sm text-muted-foreground">
                  Your settings are saved locally and used throughout the app. The calorie goal you set here will be your daily target on the dashboard.
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-8 flex gap-4">
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90"
              >
                <Save className="h-4 w-4" />
                Save Settings
              </button>
              {saved && (
                <div className="flex items-center rounded-lg bg-success/10 px-4 py-3 text-success">
                  <span className="text-sm font-medium">Settings saved successfully</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
