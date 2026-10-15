import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from monitoring.MonitoringService import MonitoringService

def main():
    service = MonitoringService()
    
    service.log_inference("MAT-001", {"current_stock": 500, "weight": 2.5}, 25.0, 12.4, actual=24.8)
    service.log_inference("MAT-002", {"current_stock": 100, "weight": 1.0}, 15.2, 14.1, actual=15.0)
    service.log_inference("MAT-003", {"current_stock": 50, "weight": 0.5}, 8.0, 11.2, actual=8.2)

    service.print_final_terminal_report()

if __name__ == "__main__":
    main()
