const db = require('../config/db');

const TestGlucosaModel = {
    // create glucose tests
    create: async (data) => {
        // Pastikan patient_id tidak null, jika null set ke 0
        const patientId = data.patient_id ? data.patient_id : 0;

        const [result] = await db.query(
            'INSERT INTO glucosa_tests (date_time, glucos_value, unit, patient_id, device_name, metode, is_validation, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [data.date_time, data.glucos_value, data.unit, patientId, data.device_name, data.metode, data.is_validation, data.note] // Gunakan 0 jika tidak ada patient_id
        );

        return result.insertId;
    },

    // get all glucose tests with pagination
    getAllTests: async (limit = 10, offset = 0, filters = {}) => {
        try {
            // Bangun query utama
            let query = `
                SELECT gt.*, p.name AS patient_name, p.patient_code AS patient_code 
                FROM glucosa_tests gt
                JOIN patients p ON gt.patient_id = p.id
            `;

            const queryParams = [];
            const whereConditions = [];

            // Filter berdasarkan tanggal
            if (filters.date_time) {
                whereConditions.push('DATE(gt.date_time) = DATE(?)');
                queryParams.push(filters.date_time);
            }

            // Filter berdasarkan rentang tanggal
            if (filters.start_date && filters.end_date) {
                whereConditions.push('DATE(gt.date_time) BETWEEN DATE(?) AND DATE(?)');
                queryParams.push(filters.start_date, filters.end_date);
            }

            // Filter berdasarkan is_validation
            if (filters.is_validation !== undefined) {
                whereConditions.push('gt.is_validation = ?');
                queryParams.push(filters.is_validation);
            }

            // Filter berdasarkan patient_id
            if (filters.patient_id) {
                whereConditions.push('gt.patient_id = ?');
                queryParams.push(filters.patient_id);
            }

            // Filter pencarian berdasarkan nama atau kode pasien (case-insensitive)
            if (filters.search) {
                whereConditions.push('(LOWER(p.name) LIKE LOWER(?) OR LOWER(p.patient_code) LIKE LOWER(?))');
                const searchKeyword = `%${filters.search}%`;
                queryParams.push(searchKeyword, searchKeyword);
            }

            // Tambahkan WHERE clause jika ada kondisi
            if (whereConditions.length > 0) {
                query += ' WHERE ' + whereConditions.join(' AND ');
            }

            // Urutkan berdasarkan terbaru dan tambahkan pagination
            query += ' ORDER BY gt.created_at DESC LIMIT ? OFFSET ?';
            queryParams.push(limit, offset);

            console.log("Executing Query:", query);
            console.log("Query Parameters:", queryParams);

            const [rows] = await db.query(query, queryParams);

            // Query untuk count total data
            let countQuery = `
                SELECT COUNT(*) as total 
                FROM glucosa_tests gt
                JOIN patients p ON gt.patient_id = p.id
            `;

            if (whereConditions.length > 0) {
                countQuery += ' WHERE ' + whereConditions.join(' AND ');
            }

            console.log("Executing Count Query:", countQuery);

            const [countResult] = await db.query(countQuery, queryParams.slice(0, queryParams.length - 2));
            const totalCount = countResult[0]?.total || 0;

            return {
                status: "success",
                message: "Glucose tests retrieved successfully",
                data: {
                    glucosaTest: {
                        data: rows,
                        total: totalCount
                    },
                    pagination: {
                        currentPage: Math.floor(offset / limit) + 1,
                        totalPages: Math.ceil(totalCount / limit),
                        totalTestPatients: totalCount,
                        perPage: limit
                    }
                }
            };
        } catch (error) {
            console.error("Error fetching glucose tests:", error);
            throw new Error("Failed to fetch glucose test data.");
        }
    },

    // get glucose tests per patient with pagination by patient id
    getByPatientId: async (patientId, limit = 10, offset = 0) => {
        // Jika patientId adalah 0, kembalikan data kosong
        if (!patientId || patientId == 0) {
            return {
                data: [],
                pagination: {
                    total_records: 0,
                    total_pages: 0,
                    current_page: 1,
                    per_page: limit,
                    next_page: null,
                    prev_page: null
                }
            };
        }

        // Cek apakah patient ada
        const [patientCheck] = await db.query('SELECT id FROM patients WHERE id = ?', [patientId]);

        if (!patientCheck || patientCheck.length === 0) {
            throw new Error('Patient not found');
        }

        // Hitung total tes gula darah untuk pasien ini
        const [totalCountResult] = await db.query(
            'SELECT COUNT(*) as total FROM glucosa_tests WHERE patient_id = ?',
            [patientId]
        );
        const totalCount = totalCountResult.length > 0 ? totalCountResult[0].total : 0;

        // Ambil data tes gula darah
        const [rows] = await db.query(
            'SELECT * FROM glucosa_tests WHERE patient_id = ? ORDER BY date_time DESC LIMIT ? OFFSET ?',
            [patientId, limit, offset]
        );

        // Hitung informasi pagination
        const totalPages = Math.ceil(totalCount / limit);
        const currentPage = Math.floor(offset / limit) + 1;

        return {
            data: rows,
            pagination: {
                total_records: totalCount,
                total_pages: totalPages,
                current_page: currentPage,
                per_page: limit,
                next_page: currentPage < totalPages ? currentPage + 1 : null,
                prev_page: currentPage > 1 ? currentPage - 1 : null
            }
        };
    },

    // static async getByPatientId(patientId, limit = 10, offset = 0) {
    //     // Cek apakah patient ada
    //     const [patientCheck] = await db.query('SELECT id FROM patients WHERE id = ?', [patientId]);

    //     if (patientCheck.length === 0) {
    //         throw new Error('Patient not found');
    //     }

    //     // Hitung total tes gula darah untuk pasien ini
    //     const [totalCountResult] = await db.query(
    //         'SELECT COUNT(*) as total FROM glucosa_tests WHERE patient_id = ?',
    //         [patientId]
    //     );
    //     const totalCount = totalCountResult[0].total;

    //     // Ambil data tes gula darah
    //     const [rows] = await db.query(
    //         'SELECT * FROM glucosa_tests WHERE patient_id = ? ORDER BY date_time DESC LIMIT ? OFFSET ?',
    //         [patientId, limit, offset]
    //     );

    //     // Hitung informasi pagination
    //     const totalPages = Math.ceil(totalCount / limit);
    //     const currentPage = Math.floor(offset / limit) + 1;

    //     return {
    //         data: rows,
    //         pagination: {
    //             total_records: totalCount,
    //             total_pages: totalPages,
    //             current_page: currentPage,
    //             per_page: limit,
    //             next_page: currentPage < totalPages ? currentPage + 1 : null,
    //             prev_page: currentPage > 1 ? currentPage - 1 : null
    //         }
    //     };
    // }

    // static async getByPatientIdAll(patientId) {
    //     // Cek apakah patient ada
    //     const [patientCheck] = await db.query('SELECT id FROM patients WHERE id = ?', [patientId]);

    //     if (patientCheck.length === 0) {
    //         throw new Error('Patient not found');
    //     }

    //     // Ambil semua data tes gula darah untuk pasien ini
    //     const [rows] = await db.query(
    //         'SELECT * FROM glucosa_tests WHERE patient_id = ? ORDER BY date_time DESC',
    //         [patientId]
    //     );

    //     return rows; // Kembalikan data tes gula darah
    // }


    //get all tests per patient no pagination
    getByPatientIdAll: async (patientId) => {
        // Cek apakah patient ada
        const [patientCheck] = await db.query('SELECT id FROM patients WHERE id = ?', [patientId]);

        if (patientCheck.length === 0) {
            throw new Error('Patient not found');
        }

        // Ambil semua data tes gula darah untuk pasien ini
        const [rows] = await db.query(
            'SELECT * FROM glucosa_tests WHERE patient_id = ? ORDER BY date_time DESC',
            [patientId]
        );

        return rows;
    },

    // Dapatkan single tes gula darah berdasarkan ID
    getById: async (id) => {
        const [rows] = await db.query('SELECT * FROM glucosa_tests WHERE id = ?', [id]);
        return rows[0];
    },

    // Update tes gula darah
    update: async (id, data) => {
        const [result] = await db.query(
            'UPDATE glucosa_tests SET date_time = ?, glucos_value = ?, unit = ? WHERE id = ?',
            [data.date_time, data.glucos_value, data.unit, id]
        );
        return result.affectedRows > 0;
    },

    // Hapus tes gula darah
    delete: async (id) => {
        const [result] = await db.query('DELETE FROM glucosa_tests WHERE id = ?', [id]);
        return result.affectedRows > 0;
    },

    // Dapatkan statistik gula darah pasien
    getPatientStats: async (patientId) => {
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total_tests,
                MIN(glucos_value) as min_value,
                MAX(glucos_value) as max_value,
                AVG(glucos_value) as avg_value,
                MIN(date_time) as first_test,
                MAX(date_time) as last_test
            FROM glucosa_tests 
            WHERE patient_id = ?
        `, [patientId]);
        return stats[0];
    },

    getLatestTest: async (patientId) => {
        const [rows] = await db.query(`
            SELECT *
            FROM glucosa_tests 
            WHERE patient_id = ?
            ORDER BY date_time DESC
            LIMIT 1
        `, [patientId]);
        return rows[0];
    },

    getAllWithPagination: async (limit, offset, search = '', filters = {}) => {
        let query = `
            SELECT 
                gt.id, 
                gt.date_time, 
                gt.glucos_value, 
                gt.unit, 
                gt.patient_id, 
                gt.device_name, 
                gt.metode, 
                gt.is_validation, 
                gt.user_validation, 
                gt.note,
                gt.created_at, 
                gt.updated_at, 
                p.name AS patient_name, 
                p.patient_code AS patient_code, 
                p.gender AS patient_gender, 
                p.date_of_birth AS patient_date_of_birth, 
                p.number_phone AS patient_number_phone, 
                p.barcode AS patient_barcode
            FROM glucosa_tests gt
            JOIN patients p ON gt.patient_id = p.id
            WHERE 1=1
        `;

        const queryParams = [];

        // Filter pencarian berdasarkan nama atau kode pasien
        if (search) {
            query += ` AND (LOWER(p.name) LIKE LOWER(?) OR LOWER(p.patient_code) LIKE LOWER(?))`;
            queryParams.push(`%${search}%`, `%${search}%`);
        }

        // Filter berdasarkan tanggal
        if (filters.date_time) {
            query += ` AND DATE(gt.date_time) = DATE(?)`;
            queryParams.push(filters.date_time);
        }

        // Filter berdasarkan rentang tanggal
        if (filters.start_date && filters.end_date) {
            query += ` AND DATE(gt.date_time) BETWEEN DATE(?) AND DATE(?)`;
            queryParams.push(filters.start_date, filters.end_date);
        }

        // Filter berdasarkan is_validation
        if (filters.is_validation !== undefined) {
            query += ` AND gt.is_validation = ?`;
            queryParams.push(filters.is_validation);
        }

        query += `
            ORDER BY gt.created_at DESC
            LIMIT ? OFFSET ?
        `;

        queryParams.push(limit, offset);

        const [rows] = await db.query(query, queryParams);

        return rows;
    },

    getTotalCount: async (search = '', filters = {}) => {
        let query = `
            SELECT COUNT(*) AS total
            FROM glucosa_tests gt
            JOIN patients p ON gt.patient_id = p.id
            WHERE 1=1
        `;

        const queryParams = [];

        // Filter pencarian berdasarkan nama atau kode pasien
        if (search) {
            query += ` AND (LOWER(p.name) LIKE LOWER(?) OR LOWER(p.patient_code) LIKE LOWER(?))`;
            queryParams.push(`%${search}%`, `%${search}%`);
        }

        // Filter berdasarkan tanggal
        if (filters.date_time) {
            query += ` AND DATE(gt.date_time) = DATE(?)`;
            queryParams.push(filters.date_time);
        }

        // Filter berdasarkan rentang tanggal
        if (filters.start_date && filters.end_date) {
            query += ` AND DATE(gt.date_time) BETWEEN DATE(?) AND DATE(?)`;
            queryParams.push(filters.start_date, filters.end_date);
        }

        // Filter berdasarkan is_validation
        if (filters.is_validation !== undefined) {
            query += ` AND gt.is_validation = ?`;
            queryParams.push(filters.is_validation);
        }

        const [result] = await db.query(query, queryParams);

        return result[0].total;
    },

    syncGlucosaTests: async () => {
        try {
            // Hapus semua data di tabel glucosa_tests_sync
            await db.query('DELETE FROM glucosa_tests_sync');

            // Salin semua data dari tabel glucosa_tests ke tabel glucosa_tests_sync, kecuali kolom patient_id
            await db.query(`
                INSERT INTO glucosa_tests_sync (id, date_time, glucos_value, unit)
                SELECT id, date_time, glucos_value, unit FROM glucosa_tests
            `);

            return { status: 'success', message: 'Glucose tests synchronized successfully' };
        } catch (error) {
            throw new Error('Failed to synchronize glucose tests: ' + error.message);
        }
    },

    IsValidationTest: async (id, username, connection = db) => {
        try {
            const [result] = await connection.query(
                'UPDATE glucosa_tests SET is_validation = 1, user_validation = ? WHERE id = ?',
                [username, id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating validation status:', error);
            return false;
        }
    },


    IsValidationTest: async (id, userName, connection) => {
        const [result] = await connection.query(
            'UPDATE test_glucosa SET is_validation = 1, validated_by = ? WHERE id = ?',
            [userName, id]
        );
        return result.affectedRows > 0;
    }
    ,

    getTestDataById: async (id) => {
        try {
            const [rows] = await db.query(`
                SELECT 
                    gt.*, 
                    p.name AS patient_name, 
                    p.gender AS patient_gender, 
                    p.date_of_birth AS patient_date_of_birth, 
                    p.number_phone AS patient_number_phone 
                FROM glucosa_tests gt
                LEFT JOIN patients p ON gt.patient_id = p.id
                WHERE gt.id = ?
            `, [id]);
            return rows.length ? rows[0] : null;
        } catch (error) {
            console.error('Error fetching test data:', error);
            return null;
        }
    },

    //dashboard
    getTotalResultIsValidationDone: async () => {
        try {
            const [result] = await db.query('SELECT COUNT(*) AS total FROM glucosa_tests WHERE is_validation = 1');
            return result[0].total;
        } catch (error) {
            console.error('Error fetching total result:', error);
            return 0;
        }
    },

    getTotalResultIsValidationNotDone: async () => {
        try {
            const [result] = await db.query('SELECT COUNT(*) AS total FROM glucosa_tests WHERE is_validation = 0');
            return result[0].total;
        } catch (error) {
            console.error('Error fetching total result:', error);
            return 0;
        }
    },

    getAllTotalResults: async () => {
        try {
            const [result] = await db.query('SELECT COUNT(*) AS total FROM glucosa_tests');
            return result[0].total;
        } catch (error) {
            console.error('Error fetching total result:', error);
            return 0;
        }
    },

    getMonthlyTestResults: async (year = 2024) => {
        try {
            // Ensure year is at least 2024
            const filterYear = Math.max(2024, parseInt(year));

            const [result] = await db.query(`
                SELECT 
                    MONTH(created_at) AS month, 
                    COUNT(*) AS total
                FROM glucosa_tests
                WHERE YEAR(created_at) = ?
                GROUP BY MONTH(created_at)
                ORDER BY MONTH(created_at) ASC
            `, [filterYear]);

            return result;
        } catch (error) {
            console.error('Error fetching monthly test results:', error);
            return [];
        }
    },

    getLatestResult: async () => {
        try {
            // Langkah 1: Temukan nilai created_at hari ini dengan kondisi is_validation = 0 dan is_status = 0
            const [latestCreatedAt] = await db.query(
                'SELECT DATE(created_at) AS latest_date FROM glucosa_tests WHERE is_validation = 0 AND is_status = 0 AND DATE(created_at) = CURDATE()'
            );

            if (!latestCreatedAt[0]?.latest_date) {
                console.log('No data found for today with is_validation = 0 and is_status = 0.');
                return { total: 0, dataList: [] }; // Kembalikan total 0 dan list kosong jika tidak ada data
            }

            const latestDate = latestCreatedAt[0].latest_date;

            // Langkah 2: Hitung jumlah baris dengan created_at hari ini, is_validation = 0, dan is_status = 0
            const [resultCount] = await db.query(
                'SELECT COUNT(*) AS total FROM glucosa_tests WHERE DATE(created_at) = ? AND is_validation = 0 AND is_status = 0',
                [latestDate]
            );

            const total = resultCount[0].total;

            // Langkah 3: Ambil list data dengan created_at hari ini, is_validation = 0, dan is_status = 0
            const [resultData] = await db.query(
                'SELECT * FROM glucosa_tests WHERE DATE(created_at) = ? AND is_validation = 0 AND is_status = 0 ORDER BY created_at DESC',
                [latestDate]
            );

            // Langkah 4: Tambahkan informasi pasien dengan loop melalui resultData
            if (resultData.length > 0) {
                // Buat array dengan semua ID pasien yang unik
                const patientIds = [...new Set(resultData.map(item => item.patient_id))];

                // Ambil data pasien dalam satu query
                const [patientData] = await db.query(
                    'SELECT id, name, patient_code FROM patients WHERE id IN (?)',
                    [patientIds]
                );

                // Buat map untuk lookup cepat
                const patientMap = {};
                patientData.forEach(patient => {
                    patientMap[patient.id] = patient;
                });

                // Tambahkan informasi pasien ke setiap hasil tes
                resultData.forEach(test => {
                    const patient = patientMap[test.patient_id];
                    if (patient) {
                        test.patient_name = patient.name;
                        test.patient_code = patient.patient_code;
                    } else {
                        test.patient_name = 'Unknown';
                        test.patient_code = 'Unknown';
                    }
                });
            }

            return { total, dataList: resultData }; // Kembalikan total dan list data dengan nama dan kode pasien
        } catch (error) {
            console.error('Error fetching latest result:', error);
            return { total: 0, dataList: [] }; // Kembalikan total 0 dan list kosong jika terjadi error
        }
    },

    IsStatusTest: async (id) => {
        try {
            const [result] = await db.query('UPDATE glucosa_tests SET is_status = 1 WHERE id = ?', [id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating validation status:', error);
            return false;
        }
    },


    getByPatientIdWithPagination: async (patientId, page = 1, limit = 10, filters = {}) => {
        // Cek apakah patient ada
        const [patientCheck] = await db.query('SELECT id FROM patients WHERE id = ?', [patientId]);
        if (patientCheck.length === 0) {
            throw new Error('Patient not found');
        }

        // Hitung offset berdasarkan page dan limit
        const offset = (page - 1) * limit;

        // Siapkan query dan parameternya
        let query = 'SELECT * FROM glucosa_tests WHERE patient_id = ?';
        let countQuery = 'SELECT COUNT(*) as total FROM glucosa_tests WHERE patient_id = ?';
        const queryParams = [patientId];
        const countParams = [patientId];

        // Filter berdasarkan date_time spesifik jika disediakan
        if (filters.date_time) {
            query += ' AND DATE(date_time) = ?';
            countQuery += ' AND DATE(date_time) = ?';
            queryParams.push(filters.date_time);
            countParams.push(filters.date_time);
        }

        // Filter berdasarkan rentang date_time jika disediakan
        if (filters.start_date && filters.end_date) {
            query += ' AND date_time BETWEEN ? AND ?';
            countQuery += ' AND date_time BETWEEN ? AND ?';
            // Tambahkan waktu 00:00:00 untuk start_date dan 23:59:59 untuk end_date
            queryParams.push(`${filters.start_date} 00:00:00`);
            queryParams.push(`${filters.end_date} 23:59:59`);
            countParams.push(`${filters.start_date} 00:00:00`);
            countParams.push(`${filters.end_date} 23:59:59`);
        }

        // Filter berdasarkan is_validation jika disediakan
        if (filters.is_validation !== undefined) {
            query += ' AND is_validation = ?';
            countQuery += ' AND is_validation = ?';
            queryParams.push(parseInt(filters.is_validation));
            countParams.push(parseInt(filters.is_validation));
        }

        // Tambahkan ordering dan pagination
        query += ' ORDER BY date_time DESC LIMIT ? OFFSET ?';
        queryParams.push(parseInt(limit), parseInt(offset));

        // Eksekusi query untuk data
        const [rows] = await db.query(query, queryParams);

        // Hitung total data untuk pagination info
        const [countResult] = await db.query(countQuery, countParams);
        const totalItems = countResult[0].total;
        const totalPages = Math.ceil(totalItems / limit);

        return {
            data: rows,
            pagination: {
                total_items: totalItems,
                total_pages: totalPages,
                current_page: parseInt(page),
                items_per_page: parseInt(limit),
                has_next_page: page < totalPages,
                has_prev_page: page > 1
            }
        };
    },
}

module.exports = TestGlucosaModel;


// static async IsValidationTest(id) {
//     try {
//         const [result] = await db.execute('UPDATE test_glucosa SET is_validation = 1 WHERE id = ?', [id]);
//         return result.affectedRows > 0;
//     } catch (error) {
//         console.error('Error updating validation status:', error);
//         return false;
//     }
// }

// getLatestResult: async () => {
//     try {
//         // Langkah 1: Temukan nilai created_at hari ini dengan kondisi is_validation = 0
//         const [latestCreatedAt] = await db.query(
//             'SELECT DATE(created_at) AS latest_date FROM glucosa_tests WHERE is_validation = 0 AND DATE(created_at) = CURDATE()'
//         );

//         if (!latestCreatedAt[0]?.latest_date) {
//             console.log('No data found for today with is_validation = 0.');
//             return { total: 0, dataList: [] }; // Kembalikan total 0 dan list kosong jika tidak ada data
//         }

//         const latestDate = latestCreatedAt[0].latest_date;

//         // Langkah 2: Hitung jumlah baris dengan created_at hari ini dan is_validation = 0
//         const [resultCount] = await db.query(
//             'SELECT COUNT(*) AS total FROM glucosa_tests WHERE DATE(created_at) = ? AND is_validation = 0',
//             [latestDate]
//         );

//         const total = resultCount[0].total;

//         // Langkah 3: Ambil list data dengan created_at hari ini dan is_validation = 0
//         const [resultData] = await db.query(
//             'SELECT * FROM glucosa_tests WHERE DATE(created_at) = ? AND is_validation = 0 ORDER BY created_at DESC',
//             [latestDate]
//         );

//         return { total, dataList: resultData }; // Kembalikan total dan list data
//     } catch (error) {
//         console.error('Error fetching latest result:', error);
//         return { total: 0, dataList: [] }; // Kembalikan total 0 dan list kosong jika terjadi error
//     }
// },