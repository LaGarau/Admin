import { ref, update } from "firebase/database";
import { db } from "../../app/firebase";

// Update leaderboard collection in Firebase
export const updateLeaderboardCollection = async (players) => {
  try {
    const updates = {};
    const timestamp = Date.now();

    players.forEach((player) => {
      updates[`playerleaderboards/${player.id}`] = {
        player_id: player.id,
        player_name: player.player_name,
        total_points: player.total_points,
        scan_count: player.scan_count,
        time_span: player.time_span,
        formatted_time_span: player.formatted_time_span,
        rank: player.rank,
        last_updated: timestamp,
      };
    });

    await update(ref(db), updates);
    console.log("Leaderboard updated successfully!");
  } catch (error) {
    console.error("Error updating leaderboard:", error);
  }
};
