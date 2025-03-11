const TestGlucosaBridgingModel = require("../models/testGlucoseBridgingModels");


module.exports = {
    getAllTestBridgingPatients: async (req, res) => {
        const { page = 1, limit = 10 } = req.query;

        // Pastikan parameter `page` dan `limit` adalah angka
        const pageNumber = parseInt(page, 10) || 1;
        const limitNumber = parseInt(limit, 10) || 10;

        // Hitung offset
        const offset = (pageNumber - 1) * limitNumber;

        try {
            // Dapatkan data pasien dengan limit dan offset
            const glucosaTest = await TestGlucosaBridgingModel.getAllWithPagination(limitNumber, offset);

            // Hitung total data pasien
            const totalTestPatients = await TestGlucosaBridgingModel.getTotalCount();

            // Hitung total halaman
            const totalPages = Math.ceil(totalTestPatients / limitNumber);

            res.status(200).send({
                status: 'success',
                message: 'Glucose tests retrieved successfully',
                data: {
                    glucosaTest,
                    pagination: {
                        currentPage: pageNumber,
                        totalPages,
                        totalTestPatients,
                        perPage: limitNumber,
                    },
                },
            });
        } catch (error) {
            res.status(500).send({
                status: 'error',
                message: 'Failed to retrieve glucose test',
                data: { error: error.message },
            });
        }
    },
};