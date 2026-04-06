import { motion } from "framer-motion";
import { Heart, Home, Star, ArrowRight, Quote, Shield, BookOpen, Users } from "lucide-react";
import { WaveDivider, WaveDividerTop } from "@/components/WaveDivider";
import { PublicLayout } from "@/components/PublicLayout";
import { Link } from "react-router-dom";
import { impactStats, testimonials } from "@/data/mockData";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const steps = [
  { icon: Shield, title: "Rescue & Intake", description: "We coordinate with authorities to safely rescue girls from dangerous situations and provide immediate care." },
  { icon: BookOpen, title: "Healing & Rehabilitation", description: "Through therapy, education, and life skills training, we help each girl rebuild her confidence and future." },
  { icon: Users, title: "Reintegration", description: "When ready, we support girls in returning to safe communities with ongoing mentorship and resources." },
];

const Index = () => (
  <PublicLayout>
    {/* Hero */}
    <section className="relative bg-gradient-to-br from-primary via-primary to-accent/40 overflow-hidden">
      <div className="container mx-auto px-4 py-24 md:py-36 relative z-10">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="font-heading text-4xl md:text-6xl lg:text-7xl font-bold text-primary-foreground max-w-3xl leading-tight"
        >
          A Beautiful Harbor for Every Girl
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-6 text-lg md:text-xl text-primary-foreground/80 max-w-xl"
        >
          We provide safe homes, healing, and hope for girls who have survived abuse and trafficking.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-8 flex flex-wrap gap-4"
        >
          <Link
            to="/impact"
            className="inline-flex items-center gap-2 bg-coral text-foreground font-semibold px-8 py-3 rounded-full hover:scale-105 transition-transform shadow-warm"
          >
            See Our Impact <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#mission"
            className="inline-flex items-center gap-2 border-2 border-primary-foreground/60 text-primary-foreground font-semibold px-8 py-3 rounded-full hover:bg-primary-foreground/10 transition-colors"
          >
            Learn More
          </a>
        </motion.div>
      </div>
      {/* Animated wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <WaveDivider className="text-background" />
      </div>
    </section>

    {/* Impact Stats */}
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Girls Served", value: impactStats.girlsServed },
            { label: "Safehouses", value: impactStats.safehouses },
            { label: "Reintegrations", value: impactStats.reintegrations },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="bg-card rounded-2xl p-8 text-center shadow-warm hover:shadow-warm-hover transition-shadow"
            >
              <p className="text-5xl md:text-6xl font-bold text-secondary font-heading">{stat.value}</p>
              <p className="mt-2 text-muted-foreground font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Mission */}
    <section id="mission" className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">Our Mission</h2>
            <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
              Bella Porto Foundation provides a safe harbor for girls in the Philippines who have survived abuse and trafficking.
              Through our network of safehouses, we offer shelter, trauma-informed care, education, and a pathway to healing.
              Every girl deserves a chance to dream again.
            </p>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={1}
            className="grid grid-cols-3 gap-4"
          >
            {[
              { icon: Home, label: "Safe Homes", color: "bg-primary/10 text-primary" },
              { icon: Heart, label: "Healing", color: "bg-coral/20 text-secondary" },
              { icon: Star, label: "New Dreams", color: "bg-lavender/30 text-foreground" },
            ].map((item) => (
              <div key={item.label} className={`flex flex-col items-center gap-3 p-6 rounded-2xl ${item.color}`}>
                <item.icon className="h-10 w-10" />
                <span className="font-medium text-sm">{item.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>

    {/* How It Works */}
    <section className="relative">
      <WaveDividerTop className="text-muted" />
      <div className="bg-muted -mt-1 py-16 md:py-20">
        <div className="container mx-auto px-4">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center text-foreground mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="bg-card rounded-2xl overflow-hidden shadow-warm hover:shadow-warm-hover hover:-translate-y-1 transition-all"
              >
                <div className="h-2 bg-lavender" />
                <div className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-lavender/20 flex items-center justify-center mb-4">
                    <step.icon className="h-6 w-6 text-foreground" />
                  </div>
                  <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
                    <span className="text-secondary mr-2">{i + 1}.</span>
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      <WaveDivider className="text-muted -mt-1 rotate-180" />
    </section>

    {/* Testimonials */}
    <section className="py-16 md:py-20 bg-gradient-to-br from-coral/10 to-lavender/10">
      <div className="container mx-auto px-4">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-center text-foreground mb-12">Words from Our Supporters</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="bg-card rounded-2xl p-6 shadow-warm relative"
            >
              <Quote className="h-8 w-8 text-coral/30 absolute top-4 right-4" />
              <p className="text-foreground italic leading-relaxed mb-4">"{t.quote}"</p>
              <p className="text-sm font-semibold text-secondary">— {t.author}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  </PublicLayout>
);

export default Index;
