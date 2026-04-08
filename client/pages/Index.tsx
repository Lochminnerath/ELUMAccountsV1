import { Link } from "react-router-dom";
import { ArrowRight, Flame, TrendingUp, Heart, Moon, Zap, Apple } from "lucide-react";
import Layout from "@/components/Layout";

export default function Index() {
  return (
    <Layout>
      <div className="flex flex-col">
        {/* Hero Section */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-32">
            <div className="flex flex-col items-center text-center">
              <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
                Take Control of Your Health
              </h1>
              <p className="mt-6 text-xl text-muted-foreground sm:text-2xl">
                A comprehensive wellness platform to track nutrition, exercise, sleep, and mental health. All in one place.
              </p>
              <Link
                to="/dashboard"
                className="mt-10 inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg"
              >
                Start Tracking Today
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Features Overview */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <h2 className="mb-16 text-center text-3xl font-bold text-foreground">
              Everything You Need for Complete Health Management
            </h2>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1: Calorie Tracking */}
              <div className="rounded-xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-lg">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-primary">
                  <Flame className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-foreground">Smart Calorie Tracking</h3>
                <p className="text-muted-foreground">
                  Browse our extensive database of 3000+ foods with complete nutritional information. Quickly add meals with preset calories or customize your own.
                </p>
              </div>

              {/* Feature 2: Nutrition Facts */}
              <div className="rounded-xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-lg">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-protein">
                  <Apple className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-foreground">Detailed Nutrition</h3>
                <p className="text-muted-foreground">
                  Track protein, carbs, fats, and essential nutrients. See if your food choices align with your daily health goals and dietary needs.
                </p>
              </div>

              {/* Feature 3: Exercise Tracking */}
              <div className="rounded-xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-lg">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-carbs">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-foreground">Exercise Integration</h3>
                <p className="text-muted-foreground">
                  Log your workouts and watch your daily calorie allowance expand. Stay motivated by seeing how exercise affects your goals.
                </p>
              </div>

              {/* Feature 4: Sleep Tracking */}
              <div className="rounded-xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-lg">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-fats">
                  <Moon className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-foreground">Sleep Monitoring</h3>
                <p className="text-muted-foreground">
                  Track your sleep patterns and understand how rest impacts your health goals. Complete sleep logs for better recovery insights.
                </p>
              </div>

              {/* Feature 5: Daily Insights */}
              <div className="rounded-xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-lg">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-primary">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-foreground">Daily Questionnaire</h3>
                <p className="text-muted-foreground">
                  Receive an evening review at 7pm showing your day summary, strengths achieved, and one key weakness to improve tomorrow.
                </p>
              </div>

              {/* Feature 6: Mental Health */}
              <div className="rounded-xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-lg">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-warning">
                  <Heart className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-foreground">Mental Wellness</h3>
                <p className="text-muted-foreground">
                  Mental health questionnaire at 7pm to track your emotional wellbeing. Build healthy streaks and maintain consistent wellness habits.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-b border-border bg-secondary/30">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="grid gap-12 sm:grid-cols-3">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary sm:text-5xl">3000+</div>
                <p className="mt-2 text-muted-foreground">Foods in database</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary sm:text-5xl">Complete</div>
                <p className="mt-2 text-muted-foreground">Nutritional tracking</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary sm:text-5xl">360°</div>
                <p className="mt-2 text-muted-foreground">Health coverage</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-20 text-center">
            <h2 className="text-3xl font-bold text-foreground">
              Ready to Transform Your Health Journey?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start tracking your nutrition, exercise, sleep, and wellbeing today.
            </p>
            <Link
              to="/dashboard"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg"
            >
              Begin Your Journey
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border bg-secondary/50 py-8">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <p className="text-muted-foreground">
              Health Manager © 2024. Your complete wellness companion.
            </p>
          </div>
        </footer>
      </div>
    </Layout>
  );
}
