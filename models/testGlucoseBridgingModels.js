const dbBridging = require('../config/dbBridging');

class TestGlucosaBridgingModel {
    static async getAllTestBridging(limit = 10, offset = 0, filters = {}) {
        try {
            // Bangun query utama
            let query = `
                SELECT gt.*, p.name AS patient_name 
                FROM glucosa_test gt
                JOIN patients p ON gt.patient_id = p.id
            `;

            const queryParams = [];
            const whereConditions = [];

            // Filter berdasarkan unit
            if (filters.unit) {
                whereConditions.push('gt.unit = ?');
                queryParams.push(filters.unit);
            }

            // Filter berdasarkan rentang tanggal
            if (filters.start_date && filters.end_date) {
                whereConditions.push('gt.date_time BETWEEN ? AND ?');
                queryParams.push(filters.start_date, filters.end_date);
            }

            // Filter berdasarkan patient_id
            if (filters.patient_id) {
                whereConditions.push('gt.patient_id = ?');
                queryParams.push(filters.patient_id);
            }

            // Tambahkan WHERE clause jika ada kondisi
            if (whereConditions.length > 0) {
                query += ' WHERE ' + whereConditions.join(' AND ');
            }

            // Urutkan dari terbaru ke lama dan tambahkan pagination
            query += ' ORDER BY gt.date_time DESC LIMIT ? OFFSET ?';
            queryParams.push(limit, offset);

            console.log("Executing Query:", query, queryParams); // Debugging query
            const [rows] = await db.query(query, queryParams);

            // Query untuk count total data (gunakan filter yang sama)
            let countQuery = `
                SELECT COUNT(*) as total 
                FROM glucosa_test gt
                JOIN patients p ON gt.patient_id = p.id
            `;

            if (whereConditions.length > 0) {
                countQuery += ' WHERE ' + whereConditions.join(' AND ');
            }

            console.log("Executing Count Query:", countQuery, queryParams); // Debugging query count
            const [countResult] = await dbBridging.query(countQuery, queryParams);
            const totalCount = countResult[0].total;

            return {
                data: rows,
                pagination: {
                    total_records: totalCount,
                    total_pages: Math.ceil(totalCount / limit),
                    current_page: Math.floor(offset / limit) + 1,
                    per_page: limit
                }
            };
        } catch (error) {
            console.error("Error fetching glucose tests:", error);
            throw new Error("Failed to fetch glucose test data.");
        }
    }

    static async getAllWithPagination(limit, offset) {
        const [rows] = await dbBridging.query(`SELECT * FROM glucosa_test LIMIT ? OFFSET ?`, [limit, offset]);
        return rows;
    }

    static async getTotalCount() {
        const [rows] = await dbBridging.query('SELECT COUNT(*) as total FROM glucosa_test');
        return rows[0].total;
    }

}

module.exports = TestGlucosaBridgingModel;