import {
    Camera, LayoutDashboard, History, Settings as SettingsIcon,
    HelpCircle, ArrowRight
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';

const HelpStep = ({ icon: Icon, title, steps }: { icon: any, title: string, steps: string[] }) => (
    <Card className="border-none shadow-lg glass-panel overflow-hidden group">
        <CardContent className="p-6">
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
                    <Icon size={24} />
                </div>
                <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 tracking-tight">{title}</h3>
                    <ul className="space-y-2">
                        {steps.map((step, i) => (
                            <li key={i} className="flex gap-2 text-sm text-gray-500">
                                <span className="text-primary font-bold">{i + 1}.</span>
                                {step}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </CardContent>
    </Card>
);

const UserGuide = () => {
    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
            <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-widest mb-2">
                    <HelpCircle size={14} />
                    Documentation
                </div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">System User Guide</h1>
                <p className="text-gray-500 max-w-xl mx-auto">
                    A quick step-by-step guide to help you manage raw materials efficiently and accurately.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <HelpStep
                    icon={LayoutDashboard}
                    title="Real-Time Monitoring"
                    steps={[
                        "Check the Dashboard for high-level stock statistics.",
                        "Monitor the Global Status for any critical material shortages.",
                        "View Active Alerts to prioritize urgent stock replenishments."
                    ]}
                />
                <HelpStep
                    icon={Camera}
                    title="Scanning & Movements"
                    steps={[
                        "Navigate to 'Scan Movement' to record stock changes.",
                        "Scan the material barcode or search by ID manually.",
                        "Enter the quantity and select INWARD or OUTWARD."
                    ]}
                />
                <HelpStep
                    icon={SettingsIcon}
                    title="Configuring Thresholds"
                    steps={[
                        "Go to Settings to adjust stock limits per material.",
                        "Define 'Low' and 'Critical' levels for automated alerts.",
                        "Changes reflect instantly across all dashboards."
                    ]}
                />
                <HelpStep
                    icon={History}
                    title="Auditing Movements"
                    steps={[
                        "Open the Transactions log to see historical movements.",
                        "Every action is logged with User ID and Timestamp.",
                        "Use these logs for end-of-day stock reconciliation."
                    ]}
                />
            </div>

            <Card className="border-none shadow-xl glass-panel bg-primary text-white overflow-hidden relative">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
                <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold tracking-tight">Ready to get started?</h3>
                        <p className="text-primary-foreground/80 text-sm">Jump back to the dashboard to see your current stock levels.</p>
                    </div>
                    <a href="/" className="px-8 py-3 bg-white text-primary font-bold rounded-xl shadow-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                        Go to Dashboard
                        <ArrowRight size={18} />
                    </a>
                </CardContent>
            </Card>
        </div>
    );
};

export default UserGuide;
