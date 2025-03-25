import { defineStore } from "pinia";
import router from "@/router";

export const useSessionTimerStore = defineStore("sessionTimer", {
    state: () => ({
        sessionTime: 300,        // 300=5 minutos en segundos, las pasarelas mueren entre 5 y 7min aprox, asi que 5min es un buen tiempo :D
        timeLeft: 300,
        timer: null,
        isActive: false,
    }),
    actions: {
        startTimer() {
            this.stopTimer();
            this.timeLeft = this.sessionTime;
            this.isActive = true;

            this.timer = setInterval(() => {
                if (this.timeLeft > 0) {
                    this.timeLeft--;
                } else {
                    this.stopTimer();
                    router.push({ name: "SessionCaducada" });
                }
            }, 1000);
        },
        stopTimer() {
            if (this.timer) {
                clearInterval(this.timer);
                this.timer = null;
                this.isActive = false;
            }
        },
        resetTimer() {
            this.timeLeft = this.sessionTime;
        },
        routerPush(routeName) {
            this.$router.push({ name: routeName });
        }
    }
});
